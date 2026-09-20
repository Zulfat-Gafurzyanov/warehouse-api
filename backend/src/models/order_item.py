"""SQLAlchemy модель позиции заказа — используется для генерации миграций Alembic."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class OrderItem(Base):
    """price — цена товара на момент заказа (снимок, не ссылка на Product.base_price)."""

    __tablename__ = "order_item"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("order.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("product.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    price: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
