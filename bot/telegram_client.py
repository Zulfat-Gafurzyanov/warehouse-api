import logging

import httpx

logger = logging.getLogger(__name__)


class TelegramClient:
    def __init__(self, bot_token: str, admin_chat_id: str):
        self.bot_token = bot_token
        self.admin_chat_id = admin_chat_id

    @property
    def is_configured(self) -> bool:
        return bool(self.bot_token and self.admin_chat_id)

    async def send_message(self, text: str) -> None:
        if not self.is_configured:
            logger.info("Telegram send skipped: bot not configured")
            return

        url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json={"chat_id": self.admin_chat_id, "text": text})
            response.raise_for_status()
