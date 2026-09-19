import logging

import redis.asyncio as redis
from asyncpg.exceptions import UniqueViolationError
from fastapi import HTTPException, status

from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_password,
    store_refresh_token,
    verify_password,
)
from src.repository.user import UserRepository
from src.schemas.auth import SignInRequest, SignUpRequest, TokenPair

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, repository: UserRepository, redis_client: redis.Redis):
        self.repository = repository
        self.redis = redis_client

    async def sign_up(self, request: SignUpRequest) -> TokenPair:
        hashed = hash_password(request.password)

        try:
            user = await self.repository.create(request.email, hashed)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Email уже зарегистрирован") from e

        access = create_access_token(user["id"], user["role"])
        refresh, jti = create_refresh_token(user["id"])
        await store_refresh_token(user["id"], jti, self.redis)

        return TokenPair(access_token=access, refresh_token=refresh)

    async def sign_in(self, request: SignInRequest) -> TokenPair:
        user = await self.repository.get_by_email(request.email)
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")

        if not verify_password(request.password, user["password_hash"]):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверный email или пароль")

        if not user["is_active"]:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Аккаунт заблокирован")

        access = create_access_token(user["id"], user["role"])
        refresh, jti = create_refresh_token(user["id"])
        await store_refresh_token(user["id"], jti, self.redis)

        return TokenPair(access_token=access, refresh_token=refresh)

    async def refresh(self, refresh_token: str) -> TokenPair:
        user_id = await decode_refresh_token(refresh_token, self.redis)

        user = await self.repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Пользователь не найден")

        access = create_access_token(user_id, user["role"])
        new_refresh, jti = create_refresh_token(user_id)
        await store_refresh_token(user_id, jti, self.redis)

        return TokenPair(access_token=access, refresh_token=new_refresh)
