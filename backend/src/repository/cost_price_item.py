import asyncpg

_COLUMNS = """
    id, name, photo_url, unit_price, quantity, china_delivery_price, russia_delivery_price,
    created_at, updated_at
"""


class CostPriceItemRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create(
        self,
        name: str,
        photo_url: str | None,
        unit_price: float,
        quantity: int,
        china_delivery_price: float,
        russia_delivery_price: float,
    ) -> asyncpg.Record:
        return await self.conn.fetchrow(
            f"""
            INSERT INTO cost_price_item
                (name, photo_url, unit_price, quantity, china_delivery_price, russia_delivery_price)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING {_COLUMNS}
            """,
            name, photo_url, unit_price, quantity, china_delivery_price, russia_delivery_price,
        )

    async def get_all(self) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            f"SELECT {_COLUMNS} FROM cost_price_item ORDER BY id DESC"
        )

    async def update(self, item_id: int, fields: dict) -> asyncpg.Record | None:
        if not fields:
            return await self.conn.fetchrow(
                f"SELECT {_COLUMNS} FROM cost_price_item WHERE id = $1", item_id
            )
        set_clauses = ", ".join(f"{key} = ${i}" for i, key in enumerate(fields, start=2))
        return await self.conn.fetchrow(
            f"""
            UPDATE cost_price_item
            SET {set_clauses}, updated_at = NOW()
            WHERE id = $1
            RETURNING {_COLUMNS}
            """,
            item_id, *fields.values(),
        )

    async def delete(self, item_id: int) -> bool:
        result = await self.conn.execute("DELETE FROM cost_price_item WHERE id = $1", item_id)
        return result == "DELETE 1"
