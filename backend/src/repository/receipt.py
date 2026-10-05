from decimal import ROUND_HALF_UP, Decimal

import asyncpg


class ReceiptProductNotFoundError(Exception):
    def __init__(self, product_id: int):
        self.product_id = product_id
        super().__init__(f"Product {product_id} not found")


class ReceiptNotReversibleError(Exception):
    """По товару после этой приёмки уже было другое движение — честно откатить нельзя."""

    def __init__(self, product_name: str):
        self.product_name = product_name
        super().__init__(f"Receipt not reversible because of {product_name}")


class ReceiptRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create(self, admin_user_id: int, comment: str | None, items: list[dict]) -> int:
        """items: [{"product_id", "quantity", "unit_cost"}, ...]. Один документ на все позиции —
        каждая пересчитывает cost_price своего товара по средневзвешенной себестоимости,
        как при точечной приёмке, но одной транзакцией и с общим номером документа."""
        async with self.conn.transaction():
            receipt_id = await self.conn.fetchval(
                """
                INSERT INTO stock_receipt (comment, created_by)
                VALUES ($1, $2)
                RETURNING id
                """,
                comment, admin_user_id,
            )

            for item in items:
                previous = await self.conn.fetchrow(
                    'SELECT stock, cost_price FROM product WHERE id = $1 FOR UPDATE',
                    item["product_id"],
                )
                if not previous:
                    raise ReceiptProductNotFoundError(item["product_id"])

                old_stock = previous["stock"]
                old_cost = Decimal(str(previous["cost_price"]))
                unit_cost = Decimal(str(item["unit_cost"]))
                new_stock = old_stock + item["quantity"]
                new_cost = (
                    (Decimal(old_stock) * old_cost + Decimal(item["quantity"]) * unit_cost)
                    / Decimal(new_stock)
                ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                await self.conn.execute(
                    "UPDATE product SET stock = $2, cost_price = $3, updated_at = NOW() WHERE id = $1",
                    item["product_id"], new_stock, new_cost,
                )
                await self.conn.execute(
                    """
                    INSERT INTO stock_receipt_item (receipt_id, product_id, quantity, unit_cost)
                    VALUES ($1, $2, $3, $4)
                    """,
                    receipt_id, item["product_id"], item["quantity"], unit_cost,
                )
                await self.conn.execute(
                    """
                    INSERT INTO stock_history (product_id, change, reason, unit_cost, receipt_id)
                    VALUES ($1, $2, 'receipt', $3, $4)
                    """,
                    item["product_id"], item["quantity"], unit_cost, receipt_id,
                )

        return receipt_id

    async def get_all(self, limit: int, offset: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT r.id, r.comment, r.created_at,
                   COUNT(ri.id) AS item_count,
                   COALESCE(SUM(ri.quantity), 0)::int AS total_quantity,
                   COALESCE(SUM(ri.quantity * ri.unit_cost), 0) AS total_cost
            FROM stock_receipt r
            LEFT JOIN stock_receipt_item ri ON ri.receipt_id = r.id
            GROUP BY r.id, r.comment, r.created_at
            ORDER BY r.id DESC
            LIMIT $1 OFFSET $2
            """,
            limit, offset,
        )

    async def get_by_id(self, receipt_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            "SELECT id, comment, created_at FROM stock_receipt WHERE id = $1",
            receipt_id,
        )

    async def delete(self, receipt_id: int) -> bool:
        """Удаляет приёмку, только если по каждому её товару это было последнее движение
        остатка — иначе честно откатить средневзвешенную себестоимость уже нельзя, не
        переписав всё, что случилось после (другая приёмка, продажа, ручная правка)."""
        async with self.conn.transaction():
            items = await self.conn.fetch(
                """
                SELECT ri.product_id, ri.quantity, ri.unit_cost, p.name AS product_name,
                       p.stock AS current_stock, p.cost_price AS current_cost
                FROM stock_receipt_item ri
                JOIN product p ON p.id = ri.product_id
                WHERE ri.receipt_id = $1
                FOR UPDATE OF p
                """,
                receipt_id,
            )
            if not items:
                exists = await self.conn.fetchval(
                    "SELECT 1 FROM stock_receipt WHERE id = $1", receipt_id
                )
                if not exists:
                    return False

            for item in items:
                last = await self.conn.fetchrow(
                    """
                    SELECT reason, receipt_id FROM stock_history
                    WHERE product_id = $1
                    ORDER BY id DESC LIMIT 1
                    """,
                    item["product_id"],
                )
                if not last or last["reason"] != "receipt" or last["receipt_id"] != receipt_id:
                    raise ReceiptNotReversibleError(item["product_name"])

            for item in items:
                new_stock = item["current_stock"]
                new_cost = Decimal(str(item["current_cost"]))
                quantity = item["quantity"]
                unit_cost = Decimal(str(item["unit_cost"]))
                old_stock = new_stock - quantity

                if old_stock > 0:
                    old_cost = (
                        (new_cost * Decimal(new_stock) - Decimal(quantity) * unit_cost)
                        / Decimal(old_stock)
                    ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
                    if old_cost < 0:
                        old_cost = Decimal("0.00")
                else:
                    old_cost = Decimal("0.00")

                await self.conn.execute(
                    "UPDATE product SET stock = $2, cost_price = $3, updated_at = NOW() WHERE id = $1",
                    item["product_id"], old_stock, old_cost,
                )
                await self.conn.execute(
                    """
                    INSERT INTO stock_history (product_id, change, reason)
                    VALUES ($1, $2, 'manual')
                    """,
                    item["product_id"], -quantity,
                )

            result = await self.conn.execute("DELETE FROM stock_receipt WHERE id = $1", receipt_id)
        return result == "DELETE 1"

    async def get_items(self, receipt_id: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT ri.product_id, p.name AS product_name, p.sku AS product_sku,
                   (
                       SELECT pi.url FROM product_image pi
                       WHERE pi.product_id = p.id
                       ORDER BY pi.sort_order LIMIT 1
                   ) AS image_url,
                   ri.quantity, ri.unit_cost
            FROM stock_receipt_item ri
            JOIN product p ON p.id = ri.product_id
            WHERE ri.receipt_id = $1
            ORDER BY ri.id
            """,
            receipt_id,
        )
