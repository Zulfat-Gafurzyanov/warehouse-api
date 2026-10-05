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

    async def get_price_list_for_user(self, user_id: int) -> list[asyncpg.Record]:
        """Полный список товаров с действующей ценой клиента — база для страницы настройки цен.

        Приоритет тот же, что и в каталоге: индивидуальная цена > цена реализации
        (если клиент под Реализацией) > базовая цена."""
        return await self.conn.fetch(
            """
            SELECT p.id AS product_id, p.sku AS product_sku, p.name AS product_name,
                   (
                       SELECT pi.url FROM product_image pi
                       WHERE pi.product_id = p.id
                       ORDER BY pi.sort_order LIMIT 1
                   ) AS image_url,
                   p.stock, p.base_price,
                   COALESCE(
                       up.price,
                       CASE WHEN u.cooperation_type = 'consignment' THEN p.consignment_price END,
                       p.base_price
                   ) AS price,
                   (up.price IS NOT NULL) AS is_custom,
                   (
                       up.price IS NULL
                       AND u.cooperation_type = 'consignment'
                       AND p.consignment_price IS NOT NULL
                   ) AS is_group_price
            FROM product p
            LEFT JOIN user_price up ON up.product_id = p.id AND up.user_id = $1
            LEFT JOIN "user" u ON u.id = $1
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
