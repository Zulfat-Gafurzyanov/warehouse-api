"""SQLAlchemy модель товара — используется для генерации миграций Alembic."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin


class Product(TimestampMixin, Base):
    __tablename__ = "product"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    sku: Mapped[str] = mapped_column(
        sa.String(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(
        sa.String(255), nullable=False)
    category_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("category.id", ondelete="RESTRICT"),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    # Себестоимость — доступна только администратору, никогда не отдаётся клиенту.
    cost_price: Mapped[float] = mapped_column(
        sa.Numeric(12, 2), server_default="0", nullable=False)
    base_price: Mapped[float] = mapped_column(
        sa.Numeric(12, 2), nullable=False)
    stock: Mapped[int] = mapped_column(
        sa.Integer, server_default="0", nullable=False)
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, server_default=sa.true(), nullable=False)
    is_new: Mapped[bool] = mapped_column(
        sa.Boolean, server_default=sa.false(), nullable=False)
