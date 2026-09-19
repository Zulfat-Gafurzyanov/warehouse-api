"""SQLAlchemy модель пользователя — используется для генерации миграций Alembic."""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(
        sa.BigInteger, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(
        sa.String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(
        sa.String(512), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, server_default=sa.true(), nullable=False)
    role: Mapped[str] = mapped_column(
        sa.String(50), server_default="user", nullable=False)
