"""drop price group and group price

Revision ID: c2f9a1d4e7b3
Revises: 66ceda349f4a
Create Date: 2026-09-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c2f9a1d4e7b3'
down_revision: Union[str, None] = '66ceda349f4a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table('group_price')
    op.drop_constraint('user_price_group_id_fkey', 'user', type_='foreignkey')
    op.drop_column('user', 'price_group_id')
    op.drop_table('price_group')


def downgrade() -> None:
    op.create_table('price_group',
    sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('discount_percent', sa.Numeric(precision=5, scale=2), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name'),
    )
    op.add_column('user', sa.Column('price_group_id', sa.BigInteger(), nullable=True))
    op.create_foreign_key('user_price_group_id_fkey', 'user', 'price_group', ['price_group_id'], ['id'], ondelete='RESTRICT')
    op.create_table('group_price',
    sa.Column('price_group_id', sa.BigInteger(), nullable=False),
    sa.Column('product_id', sa.BigInteger(), nullable=False),
    sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['price_group_id'], ['price_group.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['product.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('price_group_id', 'product_id'),
    )
