import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_all_ok(client: AsyncClient, mock_db_conn, mock_redis):
    mock_db_conn.fetchval.return_value = 1
    mock_redis.ping.return_value = True

    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200

    body = resp.json()
    assert body["status"] == "healthy"
    assert body["database"]["status"] == "ok"
    assert body["redis"]["status"] == "ok"


@pytest.mark.asyncio
async def test_health_db_down(client: AsyncClient, mock_db_conn, mock_redis):
    mock_db_conn.fetchval.side_effect = Exception("connection refused")
    mock_redis.ping.return_value = True

    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200

    body = resp.json()
    assert body["status"] == "degraded"
    assert body["database"]["status"] == "error"
    assert body["redis"]["status"] == "ok"
