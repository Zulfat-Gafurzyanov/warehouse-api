from contextlib import asynccontextmanager

import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api import deps
from src.api.v1.router import v1_router
from src.core.config import settings
from src.core.security import load_keys
from src.db.pool import close_db_pool, init_db_pool
from src.middleware.logging import LoggingMiddleware
from src.utils.logging import setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ──────────────────────────────────────
    setup_logging()
    load_keys()
    await init_db_pool()

    pool = redis.ConnectionPool.from_url(settings.REDIS_URL)
    deps.redis_client = redis.Redis.from_pool(pool)
    await deps.redis_client.ping()

    yield

    # ── Shutdown ─────────────────────────────────────
    if deps.redis_client:
        await deps.redis_client.aclose()
    await close_db_pool()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

# ── Middleware (order matters: last added = first executed) ───

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)

# ── Routes ───────────────────────────────────────────────────

app.include_router(v1_router, prefix="/api")
