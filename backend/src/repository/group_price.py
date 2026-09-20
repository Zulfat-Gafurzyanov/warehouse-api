import asyncpg


class GroupPriceRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def set_price(self, price_group_id: int, product_id: int, price: float) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            INSERT INTO group_price (price_group_id, product_id, price)
            VALUES ($1, $2, $3)
            ON CONFLICT (price_group_id, product_id)
            DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
            RETURNING price_group_id, product_id, price
            """,
            price_group_id, product_id, price,
        )

    async def get_all_for_group(self, price_group_id: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT gp.price_group_id, gp.product_id, gp.price, p.name AS product_name, p.sku AS product_sku
            FROM group_price gp
            JOIN product p ON p.id = gp.product_id
            WHERE gp.price_group_id = $1
            ORDER BY p.name
            """,
            price_group_id,
        )

    async def delete(self, price_group_id: int, product_id: int) -> bool:
        result = await self.conn.execute(
            "DELETE FROM group_price WHERE price_group_id = $1 AND product_id = $2",
            price_group_id, product_id,
        )
        return result == "DELETE 1"
