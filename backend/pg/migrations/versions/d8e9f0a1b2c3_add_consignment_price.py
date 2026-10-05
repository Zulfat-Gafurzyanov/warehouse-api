"""add consignment price to product

Revision ID: d8e9f0a1b2c3
Revises: b5c6d7e8f9a1
Create Date: 2026-10-07 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8e9f0a1b2c3'
down_revision: Union[str, None] = 'b5c6d7e8f9a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('product', sa.Column('consignment_price', sa.Numeric(precision=12, scale=2), nullable=True))


def downgrade() -> None:
    op.drop_column('product', 'consignment_price')
