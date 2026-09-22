from decimal import Decimal

from src.repository.analytics import AnalyticsRepository
from src.schemas.analytics import (
    AnalyticsOverview,
    ClientMonthlyPoint,
    ClientStats,
    ClientTopProduct,
    MonthlyPoint,
    ProductBuyer,
    ProductStats,
    RevenuePoint,
    StaleProduct,
    TopClient,
    TopProduct,
    TurnoverItem,
)


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository):
        self.repository = repository

    async def get_overview(self) -> AnalyticsOverview:
        totals = await self.repository.get_month_totals()
        margin_row = await self.repository.get_month_margin()
        stock_row = await self.repository.get_stock_summary()
        top_products = await self.repository.get_top_products(limit=5, days=30)
        top_clients = await self.repository.get_top_clients(limit=5, days=30)

        revenue = Decimal(str(totals["revenue"]))
        cost = Decimal(str(margin_row["cost"]))
        margin = revenue - cost
        margin_percent = (margin / revenue * 100) if revenue else Decimal("0")

        return AnalyticsOverview(
            month_revenue=revenue,
            month_orders_count=totals["orders_count"],
            month_avg_order=totals["avg_order"],
            month_margin=margin,
            month_margin_percent=margin_percent,
            month_units_sold=margin_row["units"],
            active_products_count=stock_row["active_products"],
            total_stock=stock_row["total_stock"],
            top_products=[TopProduct(**dict(p)) for p in top_products],
            top_clients=[TopClient(**dict(c)) for c in top_clients],
        )

    async def get_turnover(self, limit: int) -> list[TurnoverItem]:
        rows = await self.repository.get_turnover(limit)
        return [TurnoverItem(**dict(r)) for r in rows]

    async def get_stale_products(self, days: int, limit: int) -> list[StaleProduct]:
        rows = await self.repository.get_stale_products(days, limit)
        return [StaleProduct(**dict(r)) for r in rows]

    async def get_product_stats(self, product_id: int) -> ProductStats:
        row = await self.repository.get_product_stats(product_id)
        revenue = Decimal(str(row["revenue_30d"]))
        cost = Decimal(str(row["cost_30d"]))
        profit = revenue - cost
        margin_percent = (profit / revenue * 100) if revenue else Decimal("0")
        return ProductStats(
            sold_7d=row["sold_7d"],
            sold_30d=row["sold_30d"],
            sold_90d=row["sold_90d"],
            revenue_30d=revenue,
            profit_30d=profit,
            margin_percent_30d=margin_percent,
            avg_quantity_per_order=Decimal(str(row["avg_quantity_per_order"])),
        )

    async def get_product_buyers(self, product_id: int, limit: int) -> list[ProductBuyer]:
        rows = await self.repository.get_product_buyers(product_id, limit)
        return [ProductBuyer(**dict(r)) for r in rows]

    async def get_product_sales(self, product_id: int, months: int) -> list[MonthlyPoint]:
        rows = await self.repository.get_product_sales_by_month(product_id, months)
        return [MonthlyPoint(**dict(r)) for r in rows]

    async def get_client_orders(self, user_id: int, months: int) -> list[ClientMonthlyPoint]:
        rows = await self.repository.get_client_orders_by_month(user_id, months)
        return [ClientMonthlyPoint(**dict(r)) for r in rows]

    async def get_revenue_trend(self, months: int) -> list[RevenuePoint]:
        rows = await self.repository.get_revenue_by_month(months)
        return [RevenuePoint(**dict(r)) for r in rows]

    async def get_client_stats(self, user_id: int) -> ClientStats:
        row = await self.repository.get_client_stats(user_id)
        return ClientStats(**dict(row))

    async def get_client_top_products(self, user_id: int, limit: int) -> list[ClientTopProduct]:
        rows = await self.repository.get_client_top_products(user_id, limit)
        return [ClientTopProduct(**dict(r)) for r in rows]
