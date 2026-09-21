import pytest
from httpx import AsyncClient

from src.core.security import create_access_token


def _auth_header(user_id: int, role: str) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _admin_record() -> dict:
    return {
        "id": 1, "login": "admin@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "admin",
    }


@pytest.mark.asyncio
async def test_client_cannot_access_analytics(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = {
        "id": 2, "login": "u@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "user",
    }

    resp = await client.get(
        "/api/v1/admin/analytics/overview",
        headers=_auth_header(2, "user"),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_get_overview(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.side_effect = [
        [
            {
                "product_id": 1, "name": "Магнит", "quantity": 5,
                "revenue": "500.00",
            },
        ],
        [
            {
                "user_id": 2, "login": "client@example.com", "company_name": None,
                "revenue": "500.00", "orders_count": 2,
            },
        ],
    ]

    async def fetchrow_side_effect(query, *args, **kwargs):
        if 'FROM "user"' in query:
            return _admin_record()
        return {"revenue": "500.00", "orders_count": 2, "avg_order": "250.00"}

    mock_db_conn.fetchrow.side_effect = fetchrow_side_effect

    resp = await client.get(
        "/api/v1/admin/analytics/overview",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["month_orders_count"] == 2
    assert body["top_products"][0]["name"] == "Магнит"
    assert body["top_clients"][0]["orders_count"] == 2


@pytest.mark.asyncio
async def test_admin_can_get_product_sales(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = [
        {"month": "2026-08", "quantity": 0, "revenue": "0"},
        {"month": "2026-09", "quantity": 3, "revenue": "300.00"},
    ]

    resp = await client.get(
        "/api/v1/admin/analytics/products/1/sales?months=2",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_admin_can_get_product_stock_history(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = [
        {"id": 1, "product_id": 1, "change": -3, "reason": "order", "order_id": 5,
         "created_at": "2025-01-01T00:00:00Z"},
    ]

    resp = await client.get(
        "/api/v1/admin/products/1/stock-history",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 200
    assert resp.json()[0]["reason"] == "order"


@pytest.mark.asyncio
async def test_admin_can_get_product_price_history(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = [
        {"id": 1, "product_id": 1, "old_price": "100.00", "new_price": "120.00",
         "created_at": "2025-01-01T00:00:00Z"},
    ]

    resp = await client.get(
        "/api/v1/admin/products/1/price-history",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 200
    assert resp.json()[0]["new_price"] == "120.00"
