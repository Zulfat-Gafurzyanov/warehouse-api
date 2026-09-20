import pytest
from httpx import AsyncClient

from src.core.security import create_access_token


def _auth_header(user_id: int, role: str) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _active_user_record(user_id: int, role: str = "user") -> dict:
    return {
        "id": user_id, "email": "u@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": role,
    }


@pytest.mark.asyncio
async def test_create_order_requires_auth(client: AsyncClient):
    resp = await client.post("/api/v1/orders", json={"items": [{"product_id": 1, "quantity": 1}]})
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_order_product_not_found(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _active_user_record(1)
    mock_db_conn.fetch.return_value = []  # get_prices_for_order находит 0 товаров

    resp = await client.post(
        "/api/v1/orders",
        headers=_auth_header(1, "user"),
        json={"items": [{"product_id": 999, "quantity": 1}]},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_order_insufficient_stock(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _active_user_record(1)
    mock_db_conn.fetch.return_value = [{
        "id": 1, "name": "Магнит", "sku": "MAG-001",
        "stock": 2, "is_active": True, "price": "100.00",
    }]

    resp = await client.post(
        "/api/v1/orders",
        headers=_auth_header(1, "user"),
        json={"items": [{"product_id": 1, "quantity": 5}]},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_order_empty_items_rejected(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _active_user_record(1)

    resp = await client.post(
        "/api/v1/orders",
        headers=_auth_header(1, "user"),
        json={"items": []},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_client_cannot_access_admin_orders(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _active_user_record(1)

    resp = await client.get("/api/v1/admin/orders", headers=_auth_header(1, "user"))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_set_order_status_not_found(client: AsyncClient, mock_db_conn):
    async def fetchrow_side_effect(query, *args, **kwargs):
        if 'FROM "user"' in query:
            return _active_user_record(1, role="admin")
        return None  # UPDATE "order" ... не находит заказ

    mock_db_conn.fetchrow.side_effect = fetchrow_side_effect

    resp = await client.patch(
        "/api/v1/admin/orders/999/status",
        headers=_auth_header(1, "admin"),
        json={"status": "confirmed"},
    )
    assert resp.status_code == 404
