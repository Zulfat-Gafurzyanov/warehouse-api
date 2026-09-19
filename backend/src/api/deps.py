"""Централизованный DI — архитектурное ядро приложения."""

from collections.abc import AsyncGenerator
from typing import Annotated

import asyncpg
import redis.asyncio as redis
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.security import decode_access_token
from src.db import pool as db_pool_module
from src.repository.user import UserRepository
from src.service.auth import AuthService
from src.service.user import UserService

security_scheme = HTTPBearer()

# ── Инфраструктурные зависимости ─────────────────────────

redis_client: redis.Redis | None = None


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    async with db_pool_module.db_pool.acquire() as conn:
        yield conn


def get_redis() -> redis.Redis:
    return redis_client


# ── Аутентификация ───────────────────────────────────────


async def get_current_user_id(
    credentials: Annotated[
        HTTPAuthorizationCredentials, Depends(security_scheme)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> int:
    user_id = decode_access_token(credentials.credentials)["user_id"]
    user = await UserRepository(conn).get_by_id(user_id)
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Аккаунт заблокирован")
    return user_id


async def get_current_admin(
    credentials: Annotated[
        HTTPAuthorizationCredentials, Depends(security_scheme)],
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> int:
    payload = decode_access_token(credentials.credentials)
    if payload["role"] != "admin":
        raise HTTPException(status_code=403, detail="Доступ запрещён: требуются права администратора")
    user_id = payload["user_id"]
    user = await UserRepository(conn).get_by_id(user_id)
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="Аккаунт заблокирован")
    return user_id

# ── Репозитории ──────────────────────────────────────────


async def get_user_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> UserRepository:
    return UserRepository(conn)


# ── Сервисы ──────────────────────────────────────────────


async def get_auth_service(
    repo: Annotated[UserRepository, Depends(get_user_repository)],
    redis_conn: Annotated[redis.Redis, Depends(get_redis)],
) -> AuthService:
    return AuthService(repository=repo, redis_client=redis_conn)


async def get_user_service(
    repo: Annotated[UserRepository, Depends(get_user_repository)],
) -> UserService:
    return UserService(repo)
