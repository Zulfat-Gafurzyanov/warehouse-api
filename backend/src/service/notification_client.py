"""HTTP-клиент к отдельному bot-сервису (см. /bot в корне репозитория).

Вся Telegram-специфика (токен, формат сообщения, доставка) живёт в bot-сервисе.
Здесь — только отправка структурированных данных заказа по внутреннему HTTP API.
Сбой доставки не должен ронять оформление заказа.
"""

import logging

import httpx

from src.schemas.order import OrderOut

logger = logging.getLogger(__name__)


class NotificationClient:
    def __init__(self, base_url: str, internal_token: str):
        self.base_url = base_url.rstrip("/") if base_url else ""
        self.internal_token = internal_token

    @property
    def is_configured(self) -> bool:
        return bool(self.base_url)

    async def notify_new_order(self, order: OrderOut, client_label: str) -> None:
        if not self.is_configured:
            logger.info("Order notification skipped for order %s: bot service not configured", order.id)
            return

        payload = {
            "order_id": order.id,
            "client_label": client_label,
            "created_at": order.created_at.isoformat(),
            "comment": order.comment,
            "total_amount": str(order.total_amount),
            "items": [
                {"product_name": i.product_name, "quantity": i.quantity, "price": str(i.price)}
                for i in order.items
            ],
        }
        headers = {"X-Internal-Token": self.internal_token} if self.internal_token else {}

        try:
            async with httpx.AsyncClient(timeout=10) as http_client:
                response = await http_client.post(
                    f"{self.base_url}/notify/order", json=payload, headers=headers
                )
                response.raise_for_status()
        except httpx.HTTPError:
            logger.exception("Failed to notify bot service about order %s", order.id)
