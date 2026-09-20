import logging
from typing import Annotated

import httpx
from fastapi import FastAPI, Header, HTTPException, status

from config import settings
from message import build_order_message
from schemas import OrderNotification
from telegram_client import TelegramClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="warehouse-api bot")

telegram_client = TelegramClient(settings.TELEGRAM_BOT_TOKEN, settings.TELEGRAM_ADMIN_CHAT_ID)


def _check_internal_token(x_internal_token: str | None) -> None:
    if settings.INTERNAL_API_TOKEN and x_internal_token != settings.INTERNAL_API_TOKEN:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid internal token")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "telegram_configured": telegram_client.is_configured}


@app.post("/notify/order", status_code=status.HTTP_202_ACCEPTED)
async def notify_order(
    body: OrderNotification,
    x_internal_token: Annotated[str | None, Header()] = None,
) -> dict:
    _check_internal_token(x_internal_token)

    text = build_order_message(body, settings.ADMIN_PANEL_URL)
    try:
        await telegram_client.send_message(text)
    except httpx.HTTPError as e:
        logger.exception("Failed to deliver Telegram message for order %s", body.order_id)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Failed to deliver notification") from e

    return {"sent": telegram_client.is_configured}
