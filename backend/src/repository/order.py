import asyncpg

_ORDER_COLUMNS = "id, user_id, status, comment, total_amount, created_at, updated_at"


class InsufficientStockError(Exception):
    """Остаток товара изменился между проверкой и фиксацией заказа (гонка при оформлении)."""

    def __init__(self, product_id: int, product_name: str):
        self.product_id = product_id
        self.product_name = product_name
        super().__init__(f"Insufficient stock for product {product_id}")


class OrderRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_with_items(
        self, user_id: int, comment: str | None, items: list[dict], total_amount
    ) -> asyncpg.Record:
        async with self.conn.transaction():
            for item in items:
                result = await self.conn.execute(
                    """
                    UPDATE product
                    SET stock = stock - $2, updated_at = NOW()
                    WHERE id = $1 AND stock >= $2
                    """,
                    item["product_id"], item["quantity"],
                )
                if result != "UPDATE 1":
                    raise InsufficientStockError(item["product_id"], item["name"])

            order = await self.conn.fetchrow(
                f"""
                INSERT INTO "order" (user_id, comment, total_amount)
                VALUES ($1, $2, $3)
                RETURNING {_ORDER_COLUMNS}
                """,
                user_id, comment, total_amount,
            )
            await self.conn.executemany(
                """
                INSERT INTO order_item (order_id, product_id, quantity, price)
                VALUES ($1, $2, $3, $4)
                """,
                [(order["id"], i["product_id"], i["quantity"], i["price"]) for i in items],
            )
            await self.conn.executemany(
                """
                INSERT INTO stock_history (product_id, change, reason, order_id)
                VALUES ($1, $2, 'order', $3)
                """,
                [(i["product_id"], -i["quantity"], order["id"]) for i in items],
            )
        return order

    async def get_items(self, order_id: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT oi.product_id, oi.quantity, oi.price, p.name AS product_name, p.sku AS product_sku
            FROM order_item oi
            JOIN product p ON p.id = oi.product_id
            WHERE oi.order_id = $1
            ORDER BY oi.id
            """,
            order_id,
        )

    # ── Клиент ────────────────────────────────────────────

    async def get_by_id_for_user(self, order_id: int, user_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""SELECT {_ORDER_COLUMNS} FROM "order" WHERE id = $1 AND user_id = $2""",
            order_id, user_id,
        )

    async def get_all_for_user(self, user_id: int, limit: int, offset: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT o.id, o.user_id, o.status, o.total_amount, o.created_at,
                   (SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.id) AS item_count
            FROM "order" o
            WHERE o.user_id = $1
            ORDER BY o.id DESC
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset,
        )

    # ── Админ ─────────────────────────────────────────────

    async def get_by_id(self, order_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""SELECT {_ORDER_COLUMNS} FROM "order" WHERE id = $1""",
            order_id,
        )

    async def get_all(
        self,
        limit: int,
        offset: int,
        status_filter: str | None,
        user_id: int | None = None,
    ) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT o.id, o.user_id, o.status, o.total_amount, o.created_at,
                   (SELECT COUNT(*) FROM order_item oi WHERE oi.order_id = o.id) AS item_count
            FROM "order" o
            WHERE ($3::text IS NULL OR o.status = $3)
              AND ($4::bigint IS NULL OR o.user_id = $4)
            ORDER BY o.id DESC
            LIMIT $1 OFFSET $2
            """,
            limit, offset, status_filter, user_id,
        )

    async def set_status(self, order_id: int, status: str) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""
            UPDATE "order"
            SET status = $2, updated_at = NOW()
            WHERE id = $1
            RETURNING {_ORDER_COLUMNS}
            """,
            order_id, status,
        )
