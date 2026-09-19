import datetime as dt
import logging
import uuid

import jwt
import redis.asyncio as redis
from fastapi import HTTPException, status
from passlib.hash import argon2

from src.core.config import settings

logger = logging.getLogger(__name__)

# ── Загрузка ключей ──────────────────────────────────────

_private_key: str | None = None
_public_key: str | None = None


def load_keys() -> None:
    global _private_key, _public_key
    with open(settings.JWT_PRIVATE_KEY_PATH) as f:
        _private_key = f.read()
    with open(settings.JWT_PUBLIC_KEY_PATH) as f:
        _public_key = f.read()


# ── Хэширование паролей (Argon2) ────────────────────────


def hash_password(password: str) -> str:
    return argon2.using(
        memory_cost=131072,
        time_cost=3,
        parallelism=4,
        salt_len=64,
        digest_size=64,
    ).hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return argon2.verify(password, hashed)


# ── JWT токены ──────────────────────────────────────────


def create_access_token(user_id: int, role: str) -> str:
    now = dt.datetime.now(dt.UTC)
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "iat": now,
        "exp": now + dt.timedelta(seconds=settings.ACCESS_TOKEN_LIFETIME),
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, _private_key, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: int) -> tuple[str, str]:
    now = dt.datetime.now(dt.UTC)
    jti = str(uuid.uuid4())
    payload = {
        "sub": str(user_id),
        "type": "refresh",
        "iat": now,
        "exp": now + dt.timedelta(seconds=settings.REFRESH_TOKEN_LIFETIME),
        "jti": jti,
    }
    return jwt.encode(payload, _private_key, algorithm=settings.JWT_ALGORITHM), jti


def decode_access_token(token: str) -> dict:
    """
    Декодирует access-токен и возвращает user_id и role.
    При ошибке выбрасывает HTTPException.
    """
    try:
        payload = jwt.decode(token, _public_key, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Токен истёк") from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный токен") from e

    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный тип токена")

    return {"user_id": int(payload["sub"]), "role": payload["role"]}


async def decode_refresh_token(token: str, redis_client: redis.Redis) -> int:
    """Декодирует refresh-токен, проверяет его наличие в Redis и отзывает (одноразовый)."""
    try:
        payload = jwt.decode(token, _public_key, algorithms=[settings.JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh-токен истёк") from e
    except jwt.InvalidTokenError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Недействительный refresh-токен") from e

    if payload.get("type") != "refresh":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный тип токена")

    user_id = int(payload["sub"])
    jti = payload["jti"]

    # Проверяем наличие и отзываем (одноразовый)
    key = f"user:{user_id}:refresh:{jti}"
    exists = await redis_client.delete(key)
    if not exists:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh-токен отозван или не найден")

    return user_id


async def store_refresh_token(
    user_id: int, jti: str, redis_client: redis.Redis
) -> None:
    """Сохраняет JTI refresh-токена в Redis с TTL."""
    key = f"user:{user_id}:refresh:{jti}"
    await redis_client.setex(key, settings.REFRESH_TOKEN_LIFETIME, "1")
