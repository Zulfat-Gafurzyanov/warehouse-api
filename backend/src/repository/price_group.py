import asyncpg


class PriceGroupRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create(self, name: str) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO price_group (name)
            VALUES ($1)
            RETURNING id, name, created_at, updated_at
            """,
            name,
        )

    async def get_all(self) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT id, name, created_at, updated_at
            FROM price_group
            ORDER BY name
            """
        )

    async def update_name(self, price_group_id: int, name: str) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            """
            UPDATE price_group
            SET name = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING id, name, created_at, updated_at
            """,
            price_group_id,
            name,
        )

    async def delete(self, price_group_id: int) -> bool:
        result = await self.conn.execute(
            "DELETE FROM price_group WHERE id = $1",
            price_group_id,
        )
        return result == "DELETE 1"
