"""SQLAlchemy модель цены товара для ценовой группы — используется для генерации миграций Alembic."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin


class GroupPrice(TimestampMixin, Base):
    """Цена группы применяется, если у клиента нет собственной UserPrice на товар."""

    __tablename__ = "group_price"

    price_group_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("price_group.id", ondelete="CASCADE"),
        primary_key=True,
    )
    product_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("product.id", ondelete="CASCADE"),
        primary_key=True,
    )
    price: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
