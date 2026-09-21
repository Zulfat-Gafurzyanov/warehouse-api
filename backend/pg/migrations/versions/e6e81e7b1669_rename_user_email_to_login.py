"""rename user email to login

Revision ID: e6e81e7b1669
Revises: 95789ff1fe73
Create Date: 2026-09-21 20:26:40.306976

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e6e81e7b1669'
down_revision: Union[str, None] = '95789ff1fe73'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Настоящий rename, а не drop+add — сохраняет данные существующих пользователей
    # (их текущий email становится логином без потерь).
    op.alter_column('user', 'email', new_column_name='login')
    op.execute('ALTER TABLE "user" RENAME CONSTRAINT user_email_key TO user_login_key')


def downgrade() -> None:
    op.alter_column('user', 'login', new_column_name='email')
    op.execute('ALTER TABLE "user" RENAME CONSTRAINT user_login_key TO user_email_key')
