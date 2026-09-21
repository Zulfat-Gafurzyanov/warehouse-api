"""SQLAlchemy модель истории изменения остатков — используется для генерации миграций Alembic."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class StockHistory(Base):
    """reason: 'order' (списание при заказе) или 'manual' (правка администратором)."""

    __tablename__ = "stock_history"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
    )
    change: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    reason: Mapped[str] = mapped_column(sa.String(20), nullable=False)
    order_id: Mapped[int | None] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("order.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
