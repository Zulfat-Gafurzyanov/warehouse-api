from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_ADMIN_CHAT_ID: str = ""
    # Ссылка "Открыть заказ в CRM" в сообщении — необязательна.
    ADMIN_PANEL_URL: str = ""
    # Общий секрет с backend — запросы к /notify/* без верного заголовка отклоняются.
    # Пусто = проверка отключена (только для локальной разработки).
    INTERNAL_API_TOKEN: str = ""

    PORT: int = 8100


settings = Settings()
