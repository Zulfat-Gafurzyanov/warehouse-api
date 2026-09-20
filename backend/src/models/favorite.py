"""SQLAlchemy модель избранного товара — используется для генерации миграций Alembic."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class Favorite(Base):
    __tablename__ = "favorite"

    user_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("user.id", ondelete="CASCADE"),
        primary_key=True,
    )
    product_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("product.id", ondelete="CASCADE"),
        primary_key=True,
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
