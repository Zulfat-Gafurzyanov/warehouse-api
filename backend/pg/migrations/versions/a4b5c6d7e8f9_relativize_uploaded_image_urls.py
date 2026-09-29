"""relativize uploaded image urls

Revision ID: a4b5c6d7e8f9
Revises: f1a2b3c4d5e6
Create Date: 2026-09-30 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a4b5c6d7e8f9'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Старые ссылки на наши же загруженные фото хранили полный адрес сервера
    # (http://host:8000/uploads/...) — переносим базу на новый сервер, и все фото
    # ломаются. Оставляем только путь; внешние ссылки (не из /uploads/) не трогаем.
    op.execute(
        r"""
        UPDATE product_image
        SET url = regexp_replace(url, '^https?://[^/]+(/uploads/.*)$', '\1')
        WHERE url ~ '^https?://[^/]+/uploads/'
        """
    )


def downgrade() -> None:
    pass
