import json

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # ── Приложение ───────────────────────────────────────
    APP_NAME: str = "my-backend"
    DEBUG: bool = False
    LOGGING_LEVEL: str = "INFO"
    CORS_ORIGINS: str = '["http://localhost:3000"]'

    @property
    def cors_origins_list(self) -> list[str]:
        return json.loads(self.CORS_ORIGINS)

    # ── PostgreSQL ────────────────────────────────────────
    DATABASE_URL: str
    DATABASE_URL_SQLALCHEMY: str = ""
    DB_SCHEMA: str = "public"
    DB_MIN_POOL_SIZE: int = 5
    DB_MAX_POOL_SIZE: int = 20

    # ── Redis ─────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── JWT-аутентификация ────────────────────────────────
    JWT_PRIVATE_KEY_PATH: str = "keys/private.pem"
    JWT_PUBLIC_KEY_PATH: str = "keys/public.pem"
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_LIFETIME: int = 3600  # 1 hour
    REFRESH_TOKEN_LIFETIME: int = 604800  # 7 days

    # ── Уведомления о новых заказах (отдельный bot-сервис, см. /bot) ────
    # Пусто по умолчанию — уведомления просто не отправляются, если сервис не настроен.
    BOT_SERVICE_URL: str = ""
    # Общий секрет с bot-сервисом (совпадает с INTERNAL_API_TOKEN в bot/.env).
    INTERNAL_API_TOKEN: str = ""


settings = Settings()
