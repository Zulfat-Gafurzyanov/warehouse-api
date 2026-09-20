"""Централизованный DI — архитектурное ядро приложения."""

from collections.abc import AsyncGenerator
from typing import Annotated

import asyncpg
import redis.asyncio as redis
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.core.config import settings
from src.core.security import decode_access_token
from src.db import pool as db_pool_module
from src.repository.category import CategoryRepository
from src.repository.favorite import FavoriteRepository
from src.repository.group_price import GroupPriceRepository
from src.repository.order import OrderRepository
from src.repository.price_group import PriceGroupRepository
from src.repository.product import ProductRepository
from src.repository.user import UserRepository
from src.repository.user_price import UserPriceRepository
from src.service.auth import AuthService
from src.service.category import CategoryService
from src.service.favorite import FavoriteService
from src.service.order import OrderService
from src.service.price_group import PriceGroupService
from src.service.notification_client import NotificationClient
from src.service.product import ProductService
from src.service.user import UserService
from src.service.user_price import UserPriceService

security_scheme = HTTPBearer()

# ── Инфраструктурные зависимости ─────────────────────────

redis_client: redis.Redis | None = None


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    async with db_pool_module.db_pool.acquire() as conn:
        yield conn


def get_redis() -> redis.Redis:
    return redis_client


def get_notification_client() -> NotificationClient:
    return NotificationClient(
        base_url=settings.BOT_SERVICE_URL,
        internal_token=settings.INTERNAL_API_TOKEN,
    )


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


async def get_category_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> CategoryRepository:
    return CategoryRepository(conn)


async def get_product_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> ProductRepository:
    return ProductRepository(conn)


async def get_price_group_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> PriceGroupRepository:
    return PriceGroupRepository(conn)


async def get_group_price_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> GroupPriceRepository:
    return GroupPriceRepository(conn)


async def get_user_price_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> UserPriceRepository:
    return UserPriceRepository(conn)


async def get_favorite_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> FavoriteRepository:
    return FavoriteRepository(conn)


async def get_order_repository(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
) -> OrderRepository:
    return OrderRepository(conn)


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


async def get_category_service(
    repo: Annotated[CategoryRepository, Depends(get_category_repository)],
) -> CategoryService:
    return CategoryService(repo)


async def get_product_service(
    repo: Annotated[ProductRepository, Depends(get_product_repository)],
) -> ProductService:
    return ProductService(repo)


async def get_price_group_service(
    repo: Annotated[PriceGroupRepository, Depends(get_price_group_repository)],
    group_price_repo: Annotated[GroupPriceRepository, Depends(get_group_price_repository)],
) -> PriceGroupService:
    return PriceGroupService(repo, group_price_repo)


async def get_user_price_service(
    repo: Annotated[UserPriceRepository, Depends(get_user_price_repository)],
) -> UserPriceService:
    return UserPriceService(repo)


async def get_favorite_service(
    repo: Annotated[FavoriteRepository, Depends(get_favorite_repository)],
    product_repo: Annotated[ProductRepository, Depends(get_product_repository)],
) -> FavoriteService:
    return FavoriteService(repo, product_repo)


async def get_order_service(
    repo: Annotated[OrderRepository, Depends(get_order_repository)],
    product_repo: Annotated[ProductRepository, Depends(get_product_repository)],
) -> OrderService:
    return OrderService(repo, product_repo)
