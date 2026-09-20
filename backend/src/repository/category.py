import asyncpg


class CategoryRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create(self, name: str) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO category (name)
            VALUES ($1)
            RETURNING id, name, created_at, updated_at
            """,
            name,
        )

    async def get_all(self) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT id, name, created_at, updated_at
            FROM category
            ORDER BY name
            """
        )

    async def get_by_id(self, category_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            SELECT id, name, created_at, updated_at
            FROM category
            WHERE id = $1
            """,
            category_id,
        )

    async def update_name(self, category_id: int, name: str) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            UPDATE category
            SET name = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, name, created_at, updated_at
            """,
            category_id,
            name,
        )

    async def delete(self, category_id: int) -> bool:
        result = await self.conn.execute(
            """
            DELETE FROM category
            WHERE id = $1
            """,
            category_id,
        )
        return result == "DELETE 1"
