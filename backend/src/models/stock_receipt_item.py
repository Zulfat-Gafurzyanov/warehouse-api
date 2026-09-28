"""SQLAlchemy модель позиции документа приёмки — используется для генерации миграций Alembic."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class StockReceiptItem(Base):
    __tablename__ = "stock_receipt_item"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    receipt_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("stock_receipt.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("product.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    unit_cost: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
