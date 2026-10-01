"""allow client deletion without losing order history

Revision ID: b5c6d7e8f9a1
Revises: a4b5c6d7e8f9
Create Date: 2026-10-01 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b5c6d7e8f9a1'
down_revision: Union[str, None] = 'a4b5c6d7e8f9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # order.user_id был RESTRICT — удалить клиента с хотя бы одним заказом было физически
    # невозможно. Меняем на SET NULL: заказ и вся статистика (выручка/прибыль считаются из
    # order_item, не из user) остаются нетронутыми, пропадает только привязка к логину.
    op.drop_constraint('order_user_id_fkey', 'order', type_='foreignkey')
    op.alter_column('order', 'user_id', nullable=True)
    op.create_foreign_key(
        'order_user_id_fkey', 'order', 'user', ['user_id'], ['id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    op.drop_constraint('order_user_id_fkey', 'order', type_='foreignkey')
    op.alter_column('order', 'user_id', nullable=False)
    op.create_foreign_key(
        'order_user_id_fkey', 'order', 'user', ['user_id'], ['id'], ondelete='RESTRICT'
    )
