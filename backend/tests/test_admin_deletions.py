import pytest
from httpx import AsyncClient

from src.core.security import create_access_token


def _auth_header(user_id: int, role: str) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _admin_record(user_id: int = 1) -> dict:
    return {
        "id": user_id, "login": "admin@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "admin",
    }


def _client_record(user_id: int = 5) -> dict:
    return {
        "id": user_id, "login": "client@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "user",
        "company_name": None, "contact_name": None, "cooperation_type": None,
    }


# ── Удаление клиента ──────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_can_delete_client(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), _client_record()]
    mock_db_conn.execute.return_value = "DELETE 1"

    resp = await client.delete("/api/v1/admin/users/5", headers=_auth_header(1, "admin"))
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_cannot_delete_admin_account(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), _admin_record(user_id=5)]

    resp = await client.delete("/api/v1/admin/users/5", headers=_auth_header(1, "admin"))
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_delete_nonexistent_client_404(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), None]

    resp = await client.delete("/api/v1/admin/users/999", headers=_auth_header(1, "admin"))
    assert resp.status_code == 404


# ── Удаление заказа ───────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_can_delete_order_and_restores_stock(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = [{"product_id": 7, "quantity": 2}]
    mock_db_conn.execute.return_value = "DELETE 1"

    resp = await client.delete("/api/v1/admin/orders/42", headers=_auth_header(1, "admin"))
    assert resp.status_code == 204

    stock_update_calls = [
        c for c in mock_db_conn.execute.call_args_list
        if "UPDATE product SET stock = stock +" in c.args[0]
    ]
    assert len(stock_update_calls) == 1
    assert stock_update_calls[0].args[1:] == (7, 2)


@pytest.mark.asyncio
async def test_delete_nonexistent_order_404(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = []
    mock_db_conn.fetchval.return_value = None

    resp = await client.delete("/api/v1/admin/orders/999", headers=_auth_header(1, "admin"))
    assert resp.status_code == 404


# ── Комментарий заказа ────────────────────────────────────


@pytest.mark.asyncio
async def test_admin_can_update_order_comment(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [
        _admin_record(),
        {
            "id": 42, "user_id": 5, "status": "new", "comment": "уточнили адрес",
            "total_amount": "100.00", "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z",
        },
    ]
    mock_db_conn.fetch.return_value = []

    resp = await client.patch(
        "/api/v1/admin/orders/42/comment",
        headers=_auth_header(1, "admin"),
        json={"comment": "уточнили адрес"},
    )
    assert resp.status_code == 200
    assert resp.json()["comment"] == "уточнили адрес"


# ── Список заказов не теряет заказы удалённых клиентов ────


@pytest.mark.asyncio
async def test_admin_order_list_shows_orders_with_deleted_client(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.fetch.return_value = [{
        "id": 42, "user_id": None, "status": "new", "total_amount": "100.00",
        "created_at": "2025-01-01T00:00:00Z", "client_login": None,
        "client_company_name": None, "item_count": 1,
    }]

    resp = await client.get("/api/v1/admin/orders", headers=_auth_header(1, "admin"))
    assert resp.status_code == 200
    body = resp.json()
    assert body[0]["user_id"] is None
