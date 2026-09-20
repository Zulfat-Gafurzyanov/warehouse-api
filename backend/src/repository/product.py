import asyncpg

_ADMIN_COLUMNS = """
    id, sku, name, category_id, description, cost_price, base_price,
    stock, is_active, is_new, created_at, updated_at
"""

# COALESCE(индивидуальная цена, цена группы клиента, базовая цена) — приоритет из ТЗ.
_CLIENT_PRICE_JOIN = """
    LEFT JOIN user_price up ON up.product_id = p.id AND up.user_id = $1
    LEFT JOIN "user" u ON u.id = $1
    LEFT JOIN group_price gp ON gp.product_id = p.id AND gp.price_group_id = u.price_group_id
"""


class ProductRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    # ── Запись (админ) ────────────────────────────────────

    async def create(
        self,
        sku: str,
        name: str,
        category_id: int,
        description: str | None,
        cost_price: float,
        base_price: float,
        stock: int,
        is_new: bool,
        image_urls: list[str],
    ) -> asyncpg.Record:
        async with self.conn.transaction():
            product = await self.conn.fetchrow(
                f"""
                INSERT INTO product (sku, name, category_id, description, cost_price, base_price, stock, is_new)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING {_ADMIN_COLUMNS}
                """,
                sku, name, category_id, description, cost_price, base_price, stock, is_new,
            )
            if image_urls:
                await self._replace_images(product["id"], image_urls)
        return product

    async def update(self, product_id: int, fields: dict, image_urls: list[str] | None) -> asyncpg.Record | None:
        async with self.conn.transaction():
            if fields:
                set_clauses = ", ".join(f"{key} = ${i}" for i, key in enumerate(fields, start=2))
                product = await self.conn.fetchrow(
                    f"""
                    UPDATE product
                    SET {set_clauses}, updated_at = NOW()
                    WHERE id = $1
                    RETURNING {_ADMIN_COLUMNS}
                    """,
                    product_id, *fields.values(),
                )
            else:
                product = await self.get_admin_by_id(product_id)

            if product and image_urls is not None:
                await self._replace_images(product_id, image_urls)

        return product

    async def _replace_images(self, product_id: int, image_urls: list[str]) -> None:
        await self.conn.execute("DELETE FROM product_image WHERE product_id = $1", product_id)
        if image_urls:
            await self.conn.executemany(
                "INSERT INTO product_image (product_id, url, sort_order) VALUES ($1, $2, $3)",
                [(product_id, url, i) for i, url in enumerate(image_urls)],
            )

    # ── Чтение (админ) ────────────────────────────────────

    async def get_admin_by_id(self, product_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"SELECT {_ADMIN_COLUMNS} FROM product WHERE id = $1", product_id
        )

    async def get_admin_all(
        self, limit: int, offset: int, category_id: int | None, search: str | None
    ) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            f"""
            SELECT {_ADMIN_COLUMNS}
            FROM product
            WHERE ($3::bigint IS NULL OR category_id = $3)
              AND ($4::text IS NULL OR name ILIKE '%' || $4 || '%' OR sku ILIKE '%' || $4 || '%')
            ORDER BY id DESC
            LIMIT $1 OFFSET $2
            """,
            limit, offset, category_id, search,
        )

    async def get_images(self, product_id: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            "SELECT id, url, sort_order FROM product_image WHERE product_id = $1 ORDER BY sort_order",
            product_id,
        )

    # ── Чтение (клиент, с резолвом цены) ─────────────────

    async def get_client_by_id(self, product_id: int, user_id: int) -> asyncpg.Record | None:
        return await self.conn.fetchrow(
            f"""
            SELECT p.id, p.sku, p.name, p.category_id, p.description, p.stock, p.is_new,
                   COALESCE(up.price, gp.price, p.base_price) AS price
            FROM product p
            {_CLIENT_PRICE_JOIN}
            WHERE p.id = $2 AND p.is_active = true
            """,
            user_id, product_id,
        )

    async def get_catalog(
        self,
        user_id: int,
        limit: int,
        offset: int,
        category_id: int | None,
        search: str | None,
    ) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            f"""
            SELECT p.id, p.sku, p.name, p.category_id, p.description, p.stock, p.is_new,
                   COALESCE(up.price, gp.price, p.base_price) AS price,
                   (
                       SELECT pi.url FROM product_image pi
                       WHERE pi.product_id = p.id
                       ORDER BY pi.sort_order LIMIT 1
                   ) AS image_url
            FROM product p
            {_CLIENT_PRICE_JOIN}
            WHERE p.is_active = true
              AND ($4::bigint IS NULL OR p.category_id = $4)
              AND ($5::text IS NULL OR p.name ILIKE '%' || $5 || '%' OR p.sku ILIKE '%' || $5 || '%')
            ORDER BY p.id DESC
            LIMIT $2 OFFSET $3
            """,
            user_id, limit, offset, category_id, search,
        )
