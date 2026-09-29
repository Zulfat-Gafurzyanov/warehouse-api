"""add unit_cost to order item

Revision ID: f1a2b3c4d5e6
Revises: c2f9a1d4e7b3
Create Date: 2026-09-30 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'c2f9a1d4e7b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('order_item', sa.Column('unit_cost', sa.Numeric(precision=12, scale=2), nullable=True))
    # Для уже существующих заказов точной исторической себестоимости не было —
    # подставляем текущую как лучшее доступное приближение, чтобы аналитика не падала на NULL.
    op.execute(
        """
        UPDATE order_item oi
        SET unit_cost = p.cost_price
        FROM product p
        WHERE p.id = oi.product_id AND oi.unit_cost IS NULL
        """
    )


def downgrade() -> None:
    op.drop_column('order_item', 'unit_cost')
