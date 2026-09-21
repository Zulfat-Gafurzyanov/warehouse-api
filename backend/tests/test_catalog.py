import pytest
from httpx import AsyncClient

from src.core.security import create_access_token
from src.schemas.product import ProductAdminOut, ProductClientListItem, ProductClientOut


def _auth_header(user_id: int, role: str) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def test_client_schemas_never_expose_cost_price():
    """Себестоимость не должна физически попадать в client-схемы — структурная гарантия, а не фильтр на выводе."""
    assert "cost_price" not in ProductClientOut.model_fields
    assert "cost_price" not in ProductClientListItem.model_fields
    assert "base_price" not in ProductClientOut.model_fields
    assert "base_price" not in ProductClientListItem.model_fields
    assert "cost_price" in ProductAdminOut.model_fields


@pytest.mark.asyncio
async def test_list_products_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/products")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_client_cannot_create_category(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = {
        "id": 1, "login": "u@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "user",
    }

    resp = await client.post(
        "/api/v1/admin/categories",
        headers=_auth_header(1, "user"),
        json={"name": "Магниты"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_create_category(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [
        {
            "id": 1, "login": "admin@example.com", "is_active": True,
            "created_at": "2025-01-01T00:00:00Z", "role": "admin",
        },
        {
            "id": 1, "name": "Магниты",
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-01T00:00:00Z",
        },
    ]

    resp = await client.post(
        "/api/v1/admin/categories",
        headers=_auth_header(1, "admin"),
        json={"name": "Магниты"},
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Магниты"


@pytest.mark.asyncio
async def test_create_category_duplicate_name_conflict(client: AsyncClient, mock_db_conn):
    from asyncpg.exceptions import UniqueViolationError

    async def fetchrow_side_effect(query, *args, **kwargs):
        if 'FROM "user"' in query:
            return {
                "id": 1, "login": "admin@example.com", "is_active": True,
                "created_at": "2025-01-01T00:00:00Z", "role": "admin",
            }
        raise UniqueViolationError("duplicate key")

    mock_db_conn.fetchrow.side_effect = fetchrow_side_effect

    resp = await client.post(
        "/api/v1/admin/categories",
        headers=_auth_header(1, "admin"),
        json={"name": "Магниты"},
    )
    assert resp.status_code == 409
