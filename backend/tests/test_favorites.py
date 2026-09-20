import pytest
from httpx import AsyncClient

from src.core.security import create_access_token


def _auth_header(user_id: int, role: str) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _active_user_record(user_id: int) -> dict:
    return {
        "id": user_id, "email": "u@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "user",
    }


@pytest.mark.asyncio
async def test_list_favorites_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/favorites")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_add_favorite_success(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _active_user_record(1)

    resp = await client.put("/api/v1/favorites/1", headers=_auth_header(1, "user"))
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_add_favorite_nonexistent_product(client: AsyncClient, mock_db_conn):
    from asyncpg.exceptions import ForeignKeyViolationError

    mock_db_conn.fetchrow.return_value = _active_user_record(1)
    mock_db_conn.execute.side_effect = ForeignKeyViolationError("fk violation")

    resp = await client.put("/api/v1/favorites/9999", headers=_auth_header(1, "user"))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_remove_favorite_not_found(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _active_user_record(1)
    mock_db_conn.execute.return_value = "DELETE 0"

    resp = await client.delete("/api/v1/favorites/1", headers=_auth_header(1, "user"))
    assert resp.status_code == 404
