import io

import pytest
from httpx import AsyncClient

from src.core.config import settings
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
async def test_admin_can_upload_images(client: AsyncClient, mock_db_conn, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    mock_db_conn.fetchrow.return_value = _admin_record()

    resp = await client.post(
        "/api/v1/admin/uploads/images",
        headers=_auth_header(1, "admin"),
        files=[
            ("files", ("photo1.jpg", io.BytesIO(b"fake-jpeg-bytes"), "image/jpeg")),
            ("files", ("photo2.png", io.BytesIO(b"fake-png-bytes"), "image/png")),
        ],
    )
    assert resp.status_code == 201
    urls = resp.json()
    assert len(urls) == 2
    assert urls[0].endswith(".jpg")
    assert urls[1].endswith(".png")
    assert all("/uploads/" in u for u in urls)
    assert len(list(tmp_path.iterdir())) == 2


@pytest.mark.asyncio
async def test_upload_rejects_unsupported_type(client: AsyncClient, mock_db_conn, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    mock_db_conn.fetchrow.return_value = _admin_record()

    resp = await client.post(
        "/api/v1/admin/uploads/images",
        headers=_auth_header(1, "admin"),
        files={"files": ("doc.pdf", io.BytesIO(b"pdf-bytes"), "application/pdf")},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_rejects_oversized_file(client: AsyncClient, mock_db_conn, tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setattr(settings, "UPLOAD_MAX_SIZE_MB", 0)  # любой файл теперь "слишком большой"
    mock_db_conn.fetchrow.return_value = _admin_record()

    resp = await client.post(
        "/api/v1/admin/uploads/images",
        headers=_auth_header(1, "admin"),
        files={"files": ("photo.jpg", io.BytesIO(b"fake-jpeg-bytes"), "image/jpeg")},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_upload_requires_admin(client: AsyncClient, mock_db_conn):
    mock_db_conn.fetchrow.return_value = {
        "id": 2, "login": "u@example.com", "is_active": True,
        "created_at": "2025-01-01T00:00:00Z", "role": "user",
    }

    resp = await client.post(
        "/api/v1/admin/uploads/images",
        headers=_auth_header(2, "user"),
        files={"files": ("photo.jpg", io.BytesIO(b"fake-jpeg-bytes"), "image/jpeg")},
    )
    assert resp.status_code == 403
