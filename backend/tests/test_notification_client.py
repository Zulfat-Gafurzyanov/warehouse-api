import datetime as dt
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.schemas.order import OrderItemOut, OrderOut
from src.service.notification_client import NotificationClient


def _sample_order() -> OrderOut:
    return OrderOut(
        id=154, user_id=1, status="new", comment="Доставить в четверг",
        total_amount=Decimal("2900.00"), created_at=dt.datetime(2026, 9, 18, tzinfo=dt.UTC),
        items=[
            OrderItemOut(
                product_id=1, product_name="Магнит Владивосток №15",
                product_sku="MAG-015", quantity=20, price=Decimal("145.00"),
            ),
        ],
    )


@pytest.mark.asyncio
async def test_skips_when_bot_service_not_configured():
    client = NotificationClient(base_url="", internal_token="")
    with patch("src.service.notification_client.httpx.AsyncClient") as mock_client_cls:
        await client.notify_new_order(_sample_order(), "Клиент")
        mock_client_cls.assert_not_called()


@pytest.mark.asyncio
async def test_posts_order_payload_to_bot_service():
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    mock_http_client = AsyncMock()
    mock_http_client.post.return_value = mock_response
    mock_http_client.__aenter__.return_value = mock_http_client

    client = NotificationClient(base_url="http://bot:8100", internal_token="secret")
    with patch("src.service.notification_client.httpx.AsyncClient", return_value=mock_http_client):
        await client.notify_new_order(_sample_order(), "Магазин «Океан»")

    mock_http_client.post.assert_called_once()
    args, kwargs = mock_http_client.post.call_args
    assert args[0] == "http://bot:8100/notify/order"
    assert kwargs["headers"]["X-Internal-Token"] == "secret"
    assert kwargs["json"]["order_id"] == 154
    assert kwargs["json"]["client_label"] == "Магазин «Океан»"
    assert kwargs["json"]["items"][0]["product_name"] == "Магнит Владивосток №15"


@pytest.mark.asyncio
async def test_swallows_http_errors_without_raising():
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.ConnectError("boom")

    mock_http_client = AsyncMock()
    mock_http_client.post.return_value = mock_response
    mock_http_client.__aenter__.return_value = mock_http_client

    client = NotificationClient(base_url="http://bot:8100", internal_token="")
    with patch("src.service.notification_client.httpx.AsyncClient", return_value=mock_http_client):
        # Не должно поднять исключение наружу — заказ не должен падать из-за сбоя уведомления.
        await client.notify_new_order(_sample_order(), "Клиент")
