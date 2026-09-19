"""SQLAlchemy Base — используется ТОЛЬКО для генерации миграций Alembic, не для запросов."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from src.core.config import settings


class Base(DeclarativeBase):
    metadata = sa.MetaData(schema=settings.DB_SCHEMA if settings.DB_SCHEMA != "public" else None)


class TimestampMixin:
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
        nullable=False,
    )
