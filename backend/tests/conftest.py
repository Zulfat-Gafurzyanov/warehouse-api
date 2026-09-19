from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.api.deps import get_db, get_redis
from src.core.security import load_keys


@pytest.fixture(autouse=True, scope="session")
def _load_jwt_keys():
    """JWT signing needs real keys loaded; sign-up/sign-in flows exercise them."""
    load_keys()


@pytest.fixture
def mock_db_conn():
    """Mock asyncpg connection for unit tests."""
    conn = AsyncMock()
    conn.fetchrow = AsyncMock(return_value=None)
    conn.fetch = AsyncMock(return_value=[])
    conn.fetchval = AsyncMock(return_value=None)
    conn.execute = AsyncMock(return_value="OK")
    return conn


@pytest.fixture
def mock_redis():
    """Mock Redis client for unit tests."""
    r = AsyncMock()
    r.ping = AsyncMock(return_value=True)
    r.get = AsyncMock(return_value=None)
    r.setex = AsyncMock()
    r.delete = AsyncMock(return_value=1)
    return r


@pytest_asyncio.fixture
async def client(mock_db_conn, mock_redis) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client with mocked DB and Redis dependencies."""
    from main import app

    async def override_get_db():
        yield mock_db_conn

    def override_get_redis():
        return mock_redis

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis] = override_get_redis

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
