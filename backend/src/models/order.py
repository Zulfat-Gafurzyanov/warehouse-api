"""SQLAlchemy модель заказа — используется для генерации миграций Alembic."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin


class Order(TimestampMixin, Base):
    """Статусы: new, confirmed, processing, ready, delivered, cancelled."""

    __tablename__ = "order"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        sa.BigInteger,
        sa.ForeignKey("user.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        sa.String(20), server_default="new", nullable=False)
    comment: Mapped[str | None] = mapped_column(sa.Text, nullable=True)
    # Денормализованная сумма заказа — считается из OrderItem при создании.
    total_amount: Mapped[float] = mapped_column(
        sa.Numeric(12, 2), server_default="0", nullable=False)
