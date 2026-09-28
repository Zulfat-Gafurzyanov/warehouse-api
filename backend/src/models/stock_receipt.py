"""SQLAlchemy модель документа приёмки — используется для генерации миграций Alembic."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class StockReceipt(Base):
    """Шапка документа приёмки (аналог приходной накладной) — сами позиции в StockReceiptItem."""

    __tablename__ = "stock_receipt"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    comment: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("user.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
