import logging

import asyncpg

from src.core.config import settings

logger = logging.getLogger(__name__)

db_pool: asyncpg.Pool | None = None


async def init_db_pool() -> asyncpg.Pool:
    """Создаёт и возвращает пул соединений asyncpg."""
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=settings.DB_MIN_POOL_SIZE,
            max_size=settings.DB_MAX_POOL_SIZE,
            command_timeout=30,
        )
    except (asyncpg.PostgresError, OSError) as e:
        logger.critical("Failed to create database pool: %s", e)
        raise

    # Устанавливаем search_path если схема не public
    if settings.DB_SCHEMA != "public":
        async with db_pool.acquire() as conn:
            await conn.execute(f"SET search_path TO {settings.DB_SCHEMA}")

    logger.info("Database pool initialized (min=%d, max=%d)", settings.DB_MIN_POOL_SIZE, settings.DB_MAX_POOL_SIZE)
    return db_pool


async def close_db_pool() -> None:
    """Закрывает пул соединений asyncpg."""
    global db_pool
    if db_pool:
        await db_pool.close()
        db_pool = None
        logger.info("Database pool closed")
