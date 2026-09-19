import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_sign_up_success(client: AsyncClient, mock_db_conn, mock_redis):
    mock_db_conn.fetchrow.return_value = {
        "id": 1,
        "email": "test@example.com",
        "is_active": True,
        "created_at": "2025-01-01T00:00:00Z",
        "role": "user",
    }

    resp = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "test@example.com",
            "password": "StrongPass1",
            "password_confirm": "StrongPass1",
        },
    )

    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_sign_up_passwords_mismatch(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "email": "test@example.com",
            "password": "StrongPass1",
            "password_confirm": "DifferentPass1",
        },
    )
    assert resp.status_code == 422


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
