"""SQLAlchemy модель индивидуальной цены товара для клиента — используется для генерации миграций Alembic."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin


class UserPrice(TimestampMixin, Base):
    """Индивидуальная цена имеет приоритет над ценой группы (PriceGroup) и базовой ценой (Product.base_price)."""

    __tablename__ = "user_price"

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
    price: Mapped[float] = mapped_column(sa.Numeric(12, 2), nullable=False)
