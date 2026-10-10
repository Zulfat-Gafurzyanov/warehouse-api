import pytest
from httpx import AsyncClient

from src.core.security import create_access_token


def _auth_header(user_id: int, role: str) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _admin_record() -> dict:
    return {
        "id": 1, "login": "sklad-admin", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "admin",
    }


def _item_record(**overrides) -> dict:
    base = {
        "id": 1,
        "name": "Магнит металл, партия",
        "photo_url": None,
        "unit_price": 50,
        "quantity": 5000,
        "china_delivery_price": 5,
        "russia_delivery_price": 10,
        "created_at": "2025-01-01T00:00:00Z",
        "updated_at": "2025-01-01T00:00:00Z",
    }
    base.update(overrides)
    return base


@pytest.mark.asyncio
async def test_non_admin_cannot_access_cost_price_items(client: AsyncClient, mock_db_conn):
    resp = await client.get(
        "/api/v1/admin/cost-price-items",
        headers=_auth_header(5, "user"),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_cost_price_item_computes_totals(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), _item_record()]

    resp = await client.post(
        "/api/v1/admin/cost-price-items",
        headers=_auth_header(1, "admin"),
        json={
            "name": "Магнит металл, партия",
            "unit_price": "50",
            "quantity": 5000,
            "china_delivery_price": "5",
            "russia_delivery_price": "10",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["total_cost_per_unit"] == "65"
    assert body["total_cost_batch"] == "325000"


@pytest.mark.asyncio
async def test_list_cost_price_items(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = [_item_record(), _item_record(id=2, quantity=10)]

    resp = await client.get(
        "/api/v1/admin/cost-price-items",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_update_cost_price_item(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), _item_record(quantity=4000)]

    resp = await client.patch(
        "/api/v1/admin/cost-price-items/1",
        headers=_auth_header(1, "admin"),
        json={"quantity": 4000},
    )
    assert resp.status_code == 200
    assert resp.json()["quantity"] == 4000


@pytest.mark.asyncio
async def test_update_nonexistent_cost_price_item_404(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), None]

    resp = await client.patch(
        "/api/v1/admin/cost-price-items/999",
        headers=_auth_header(1, "admin"),
        json={"quantity": 1},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_cost_price_item(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.execute.return_value = "DELETE 1"

    resp = await client.delete(
        "/api/v1/admin/cost-price-items/1",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_nonexistent_cost_price_item_404(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.execute.return_value = "DELETE 0"

    resp = await client.delete(
        "/api/v1/admin/cost-price-items/999",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 404
