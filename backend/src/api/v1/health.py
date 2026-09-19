from typing import Annotated

import asyncpg
import redis.asyncio as redis
from fastapi import APIRouter, Depends

from src.api.deps import get_db, get_redis
from src.schemas.health import ComponentHealth, HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    conn: Annotated[asyncpg.Connection, Depends(get_db)],
    redis_client: Annotated[redis.Redis, Depends(get_redis)],
) -> HealthResponse:
    # Проверяем базу данных
    try:
        await conn.fetchval("SELECT 1")
        db = ComponentHealth(status="ok")
    except Exception as e:
        db = ComponentHealth(status="error", detail=str(e))

    # Проверяем Redis
    try:
        await redis_client.ping()
        rd = ComponentHealth(status="ok")
    except Exception as e:
        rd = ComponentHealth(status="error", detail=str(e))

    overall = "healthy" if db.status == "ok" and rd.status == "ok" else "degraded"
    return HealthResponse(status=overall, database=db, redis=rd)
