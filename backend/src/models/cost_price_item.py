"""SQLAlchemy модель рабочей заметки по себестоимости партии — используется для генерации миграций Alembic.

Отдельная рабочая страница администратора для фиксации закупочной цены и доставки
партии товара из Китая до разбивки по конкретным карточкам товара. Никак не связана
с таблицами category/product — чисто справочная запись для его личного учёта."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin


class CostPriceItem(TimestampMixin, Base):
    __tablename__ = "cost_price_item"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(sa.String(255), nullable=False)
    photo_url: Mapped[str | None] = mapped_column(sa.String(1000), nullable=True)
    unit_price: Mapped[float] = mapped_column(
        sa.Numeric(12, 2), server_default="0", nullable=False)
    quantity: Mapped[int] = mapped_column(
        sa.Integer, server_default="0", nullable=False)
    china_delivery_price: Mapped[float] = mapped_column(
        sa.Numeric(12, 2), server_default="0", nullable=False)
    russia_delivery_price: Mapped[float] = mapped_column(
        sa.Numeric(12, 2), server_default="0", nullable=False)
