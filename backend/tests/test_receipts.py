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
async def test_admin_can_create_receipt_with_multiple_items(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchval.return_value = 12  # id нового документа
    mock_db_conn.fetchrow.side_effect = [
        _admin_record(),
        {"stock": 5, "cost_price": "10.00"},  # товар 1 до приёмки
        {"stock": 0, "cost_price": "0.00"},  # товар 2 до приёмки
        {"id": 12, "comment": "Накладная №55", "created_at": "2026-01-01T00:00:00Z"},
    ]
    mock_db_conn.fetch.return_value = [
        {"product_id": 1, "product_name": "Магнит", "product_sku": "MAG-001",
         "quantity": 15, "unit_cost": "20.00"},
        {"product_id": 2, "product_name": "Кружка", "product_sku": "MUG-001",
         "quantity": 10, "unit_cost": "50.00"},
    ]

    resp = await client.post(
        "/api/v1/admin/receipts",
        headers=_auth_header(1, "admin"),
        json={
            "comment": "Накладная №55",
            "items": [
                {"product_id": 1, "quantity": 15, "unit_cost": "20.00"},
                {"product_id": 2, "quantity": 10, "unit_cost": "50.00"},
            ],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"] == 12
    assert len(body["items"]) == 2
    assert body["items"][0]["quantity"] == 15


@pytest.mark.asyncio
async def test_receipt_rejects_unknown_product(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchval.return_value = 13
    mock_db_conn.fetchrow.side_effect = [
        _admin_record(),
        None,
    ]

    resp = await client.post(
        "/api/v1/admin/receipts",
        headers=_auth_header(1, "admin"),
        json={"items": [{"product_id": 999, "quantity": 10, "unit_cost": "5.00"}]},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_receipt_requires_at_least_one_item(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()

    resp = await client.post(
        "/api/v1/admin/receipts",
        headers=_auth_header(1, "admin"),
        json={"items": []},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_admin_can_list_receipts(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = [
        {"id": 5, "comment": None, "created_at": "2026-01-01T00:00:00Z",
         "item_count": 2, "total_quantity": 25, "total_cost": "500.00"},
    ]

    resp = await client.get(
        "/api/v1/admin/receipts",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 200
    assert resp.json()[0]["item_count"] == 2


@pytest.mark.asyncio
async def test_admin_can_get_receipt_detail(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [
        _admin_record(),
        {"id": 5, "comment": "test", "created_at": "2026-01-01T00:00:00Z"},
    ]
    mock_db_conn.fetch.return_value = [
        {"product_id": 1, "product_name": "Магнит", "product_sku": "MAG-001",
         "quantity": 15, "unit_cost": "20.00"},
    ]

    resp = await client.get(
        "/api/v1/admin/receipts/5",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 200
    assert resp.json()["items"][0]["product_sku"] == "MAG-001"


@pytest.mark.asyncio
async def test_get_receipt_not_found(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), None]

    resp = await client.get(
        "/api/v1/admin/receipts/999",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_receipt_requires_admin(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = {
        "id": 2, "login": "u@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "user",
    }

    resp = await client.post(
        "/api/v1/admin/receipts",
        headers=_auth_header(2, "user"),
        json={"items": [{"product_id": 1, "quantity": 10, "unit_cost": "5.00"}]},
    )
    assert resp.status_code == 403
