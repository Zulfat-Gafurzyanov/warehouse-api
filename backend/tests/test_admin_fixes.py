import pytest
from asyncpg.exceptions import ForeignKeyViolationError, UniqueViolationError
from httpx import AsyncClient

from src.core.security import create_access_token


def _auth_header(user_id: int, role: str) -> dict:
    token = create_access_token(user_id, role)
    return {"Authorization": f"Bearer {token}"}


def _admin_record() -> dict:
    return {
        "id": 1, "email": "admin@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "admin",
    }


# ── Роль пользователя больше нельзя менять — один админ ──


@pytest.mark.asyncio
async def test_set_role_endpoint_does_not_exist(client: AsyncClient, mock_db_conn):
    """Единственный админ создаётся вручную в БД; сменить роль через API нельзя даже другому админу."""
    mock_db_conn.fetchrow.return_value = _admin_record()

    resp = await client.patch(
        "/api/v1/admin/users/5/role",
        headers=_auth_header(1, "admin"),
        json={"role": "admin"},
    )
    assert resp.status_code == 404


# ── Переименование ценовой группы ────────────────────────


@pytest.mark.asyncio
async def test_admin_can_rename_price_group(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [
        _admin_record(),
        {
            "id": 2, "name": "Опт 1",
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-02T00:00:00Z",
        },
    ]

    resp = await client.patch(
        "/api/v1/admin/price-groups/2",
        headers=_auth_header(1, "admin"),
        json={"name": "Опт 1"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Опт 1"


@pytest.mark.asyncio
async def test_rename_price_group_duplicate_conflict(client: AsyncClient, mock_db_conn):
    async def fetchrow_side_effect(query, *args, **kwargs):
        if 'FROM "user"' in query:
            return _admin_record()
        raise UniqueViolationError("duplicate key")

    mock_db_conn.fetchrow.side_effect = fetchrow_side_effect

    resp = await client.patch(
        "/api/v1/admin/price-groups/2",
        headers=_auth_header(1, "admin"),
        json={"name": "Опт 1"},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_rename_price_group_not_found(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [_admin_record(), None]

    resp = await client.patch(
        "/api/v1/admin/price-groups/999",
        headers=_auth_header(1, "admin"),
        json={"name": "Опт 1"},
    )
    assert resp.status_code == 404


# ── Смена email клиента админом ──────────────────────────


@pytest.mark.asyncio
async def test_admin_can_update_client_email(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [
        _admin_record(),
        {
            "id": 5, "email": "new@example.com", "is_active": True,
            "created_at": "2025-01-01T00:00:00Z", "role": "user",
            "company_name": None, "contact_name": None,
            "cooperation_type": None, "price_group_id": None,
        },
    ]

    resp = await client.patch(
        "/api/v1/admin/users/5/profile",
        headers=_auth_header(1, "admin"),
        json={"email": "new@example.com"},
    )
    assert resp.status_code == 200
    assert resp.json()["email"] == "new@example.com"


@pytest.mark.asyncio
async def test_update_client_email_duplicate_conflict(client: AsyncClient, mock_db_conn):
    async def fetchrow_side_effect(query, *args, **kwargs):
        if 'FROM "user"' in query and "UPDATE" not in query:
            return _admin_record()
        raise UniqueViolationError("duplicate key")

    mock_db_conn.fetchrow.side_effect = fetchrow_side_effect

    resp = await client.patch(
        "/api/v1/admin/users/5/profile",
        headers=_auth_header(1, "admin"),
        json={"email": "taken@example.com"},
    )
    assert resp.status_code == 409


# ── Артикул и удаление товара ─────────────────────────────


@pytest.mark.asyncio
async def test_admin_can_update_product_sku(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.side_effect = [
        _admin_record(),
        {"base_price": "290.00", "stock": 18},  # previous values (FOR UPDATE)
        {
            "id": 8, "sku": "MUG-001", "name": "Кружка", "category_id": 1,
            "description": None, "cost_price": "80.00", "base_price": "290.00",
            "stock": 18, "is_active": True, "is_new": False,
            "created_at": "2025-01-01T00:00:00Z", "updated_at": "2025-01-02T00:00:00Z",
        },
    ]
    mock_db_conn.fetch.return_value = []  # get_images

    resp = await client.patch(
        "/api/v1/admin/products/8",
        headers=_auth_header(1, "admin"),
        json={"sku": "MUG-001"},
    )
    assert resp.status_code == 200
    assert resp.json()["sku"] == "MUG-001"


@pytest.mark.asyncio
async def test_admin_can_delete_product(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.execute.return_value = "DELETE 1"

    resp = await client.delete(
        "/api/v1/admin/products/9",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_product_not_found(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.execute.return_value = "DELETE 0"

    resp = await client.delete(
        "/api/v1/admin/products/999",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_product_referenced_by_orders_conflict(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = _admin_record()
    mock_db_conn.execute.side_effect = ForeignKeyViolationError("fk violation")

    resp = await client.delete(
        "/api/v1/admin/products/1",
        headers=_auth_header(1, "admin"),
    )
    assert resp.status_code == 409
