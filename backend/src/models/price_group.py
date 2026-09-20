"""SQLAlchemy модель ценовой группы — используется для генерации миграций Alembic."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin


class PriceGroup(TimestampMixin, Base):
    __tablename__ = "price_group"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(
        sa.String(100), unique=True, nullable=False)
