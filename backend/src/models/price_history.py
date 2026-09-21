"""SQLAlchemy модель истории изменения базовой цены — используется для генерации миграций Alembic."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class PriceHistory(Base):
    __tablename__ = "price_history"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
    )
    old_price: Mapped[float | None] = mapped_column(sa.Numeric(12, 2), nullable=True)
    new_price: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
