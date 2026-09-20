import asyncpg


class FavoriteRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def add(self, user_id: int, product_id: int) -> None:
        await self.conn.execute(
            """
            INSERT INTO favorite (user_id, product_id)
            VALUES ($1, $2)
            ON CONFLICT (user_id, product_id) DO NOTHING
            """,
            user_id, product_id,
        )

    async def remove(self, user_id: int, product_id: int) -> bool:
        result = await self.conn.execute(
            "DELETE FROM favorite WHERE user_id = $1 AND product_id = $2",
            user_id, product_id,
        )
        return result == "DELETE 1"
