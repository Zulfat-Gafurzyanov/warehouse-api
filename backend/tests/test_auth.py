import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sign_up_endpoint_does_not_exist(client: AsyncClient):
    """Самостоятельной регистрации нет — аккаунты создаёт администратор через /admin/users."""
    resp = await client.post(
        "/api/v1/auth/sign-up",
        json={"email": "test@example.com", "password": "StrongPass1"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_sign_in_invalid_email(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = None

    resp = await client.post(
        "/api/v1/auth/sign-in",
        json={
            "email": "nonexistent@example.com",
            "password": "StrongPass1",
        },
    )
    assert resp.status_code == 401
