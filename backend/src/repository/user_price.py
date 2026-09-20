import asyncpg


class UserPriceRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def set_price(self, user_id: int, product_id: int, price: float) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO user_price (user_id, product_id, price)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, product_id)
            DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
            RETURNING user_id, product_id, price
            """,
            user_id, product_id, price,
        )

    async def get_all_for_user(self, user_id: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT up.user_id, up.product_id, up.price, p.name AS product_name, p.sku AS product_sku
            FROM user_price up
            JOIN product p ON p.id = up.product_id
            WHERE up.user_id = $1
            ORDER BY p.name
            """,
            user_id,
        )

    async def delete(self, user_id: int, product_id: int) -> bool:
        result = await self.conn.execute(
            "DELETE FROM user_price WHERE user_id = $1 AND product_id = $2",
            user_id, product_id,
        )
        return result == "DELETE 1"
