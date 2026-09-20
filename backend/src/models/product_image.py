"""SQLAlchemy модель фотографии товара — используется для генерации миграций Alembic."""

import datetime as dt

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base


class ProductImage(Base):
    __tablename__ = "product_image"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    product_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("product.id", ondelete="CASCADE"),
        nullable=False,
    )
    url: Mapped[str] = mapped_column(sa.String(1000), nullable=False)
    sort_order: Mapped[int] = mapped_column(
        sa.Integer, server_default="0", nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False)
