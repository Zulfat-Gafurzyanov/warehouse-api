import asyncpg


class AnalyticsRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def get_month_totals(self) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            SELECT
                COALESCE(SUM(total_amount), 0) AS revenue,
                COUNT(*) AS orders_count,
                COALESCE(AVG(total_amount), 0) AS avg_order
            FROM "order"
            WHERE created_at >= date_trunc('month', NOW())
              AND status != 'cancelled'
            """
        )

    async def get_top_products(self, limit: int, days: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT p.id AS product_id, p.name, SUM(oi.quantity) AS quantity,
                   SUM(oi.quantity * oi.price) AS revenue
            FROM order_item oi
            JOIN "order" o ON o.id = oi.order_id
            JOIN product p ON p.id = oi.product_id
            WHERE o.created_at >= NOW() - ($2 || ' days')::interval
              AND o.status != 'cancelled'
            GROUP BY p.id, p.name
            ORDER BY revenue DESC
            LIMIT $1
            """,
            limit, str(days),
        )

    async def get_top_clients(self, limit: int, days: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT u.id AS user_id, u.login, u.company_name,
                   SUM(o.total_amount) AS revenue, COUNT(*) AS orders_count
            FROM "order" o
            JOIN "user" u ON u.id = o.user_id
            WHERE o.created_at >= NOW() - ($2 || ' days')::interval
              AND o.status != 'cancelled'
            GROUP BY u.id, u.login, u.company_name
            ORDER BY revenue DESC
            LIMIT $1
            """,
            limit, str(days),
        )

    async def get_product_sales_by_month(self, product_id: int, months: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', NOW()) - ($2::int - 1) * interval '1 month',
                    date_trunc('month', NOW()),
                    interval '1 month'
                ) AS month
            ),
            sales AS (
                SELECT date_trunc('month', o.created_at) AS month,
                       SUM(oi.quantity) AS quantity,
                       SUM(oi.quantity * oi.price) AS revenue
                FROM order_item oi
                JOIN "order" o ON o.id = oi.order_id
                WHERE oi.product_id = $1 AND o.status != 'cancelled'
                GROUP BY date_trunc('month', o.created_at)
            )
            SELECT to_char(m.month, 'YYYY-MM') AS month,
                   COALESCE(s.quantity, 0)::int AS quantity,
                   COALESCE(s.revenue, 0) AS revenue
            FROM months m
            LEFT JOIN sales s ON s.month = m.month
            ORDER BY m.month
            """,
            product_id, months,
        )

    async def get_client_orders_by_month(self, user_id: int, months: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', NOW()) - ($2::int - 1) * interval '1 month',
                    date_trunc('month', NOW()),
                    interval '1 month'
                ) AS month
            ),
            orders AS (
                SELECT date_trunc('month', o.created_at) AS month,
                       COUNT(*) AS orders_count,
                       SUM(o.total_amount) AS revenue
                FROM "order" o
                WHERE o.user_id = $1 AND o.status != 'cancelled'
                GROUP BY date_trunc('month', o.created_at)
            )
            SELECT to_char(m.month, 'YYYY-MM') AS month,
                   COALESCE(o.orders_count, 0)::int AS orders_count,
                   COALESCE(o.revenue, 0) AS revenue
            FROM months m
            LEFT JOIN orders o ON o.month = m.month
            ORDER BY m.month
            """,
            user_id, months,
        )

    async def get_client_stats(self, user_id: int) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            SELECT
                COUNT(*) AS orders_count,
                COALESCE(SUM(total_amount), 0) AS total_amount,
                MAX(created_at) AS last_order_at
            FROM "order"
            WHERE user_id = $1 AND status != 'cancelled'
            """,
            user_id,
        )

    async def get_client_top_products(self, user_id: int, limit: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            SELECT p.id AS product_id, p.name, SUM(oi.quantity) AS quantity
            FROM order_item oi
            JOIN "order" o ON o.id = oi.order_id
            JOIN product p ON p.id = oi.product_id
            WHERE o.user_id = $1 AND o.status != 'cancelled'
            GROUP BY p.id, p.name
            ORDER BY quantity DESC
            LIMIT $2
            """,
            user_id, limit,
        )

    async def get_month_margin(self) -> asyncpg.Record:
        """Выручка и себестоимость проданного за текущий месяц — для расчёта рентабельности."""
        return await self.conn.fetchrow(
            """
            SELECT
                COALESCE(SUM(oi.quantity * oi.price), 0) AS revenue,
                COALESCE(SUM(oi.quantity * p.cost_price), 0) AS cost
            FROM order_item oi
            JOIN "order" o ON o.id = oi.order_id
            JOIN product p ON p.id = oi.product_id
            WHERE o.status != 'cancelled'
              AND o.created_at >= date_trunc('month', NOW())
            """
        )

    async def get_stock_summary(self) -> asyncpg.Record:
        return await self.conn.fetchrow(
            """
            SELECT COUNT(*) AS active_products, COALESCE(SUM(stock), 0) AS total_stock
            FROM product
            WHERE is_active = true
            """
        )

    async def get_turnover(self, limit: int) -> list[asyncpg.Record]:
        """Оборачиваемость: сколько штук товара продано за последние 7/30/90 дней."""
        return await self.conn.fetch(
            """
            SELECT p.id AS product_id, p.sku, p.name, p.stock,
                   COALESCE(SUM(CASE WHEN o.created_at >= NOW() - interval '7 days'
                                      THEN oi.quantity ELSE 0 END), 0)::int AS sold_7d,
                   COALESCE(SUM(CASE WHEN o.created_at >= NOW() - interval '30 days'
                                      THEN oi.quantity ELSE 0 END), 0)::int AS sold_30d,
                   COALESCE(SUM(CASE WHEN o.id IS NOT NULL
                                      THEN oi.quantity ELSE 0 END), 0)::int AS sold_90d
            FROM product p
            LEFT JOIN order_item oi ON oi.product_id = p.id
            LEFT JOIN "order" o ON o.id = oi.order_id
                AND o.status != 'cancelled'
                AND o.created_at >= NOW() - interval '90 days'
            WHERE p.is_active = true
            GROUP BY p.id, p.sku, p.name, p.stock
            ORDER BY sold_30d DESC, sold_90d DESC
            LIMIT $1
            """,
            limit,
        )

    async def get_revenue_by_month(self, months: int) -> list[asyncpg.Record]:
        return await self.conn.fetch(
            """
            WITH months AS (
                SELECT generate_series(
                    date_trunc('month', NOW()) - ($1::int - 1) * interval '1 month',
                    date_trunc('month', NOW()),
                    interval '1 month'
                ) AS month
            ),
            orders AS (
                SELECT date_trunc('month', o.created_at) AS month,
                       COUNT(*) AS orders_count,
                       SUM(o.total_amount) AS revenue
                FROM "order" o
                WHERE o.status != 'cancelled'
                GROUP BY date_trunc('month', o.created_at)
            )
            SELECT to_char(m.month, 'YYYY-MM') AS month,
                   COALESCE(o.orders_count, 0)::int AS orders_count,
                   COALESCE(o.revenue, 0) AS revenue
            FROM months m
            LEFT JOIN orders o ON o.month = m.month
            ORDER BY m.month
            """,
            months,
        )
