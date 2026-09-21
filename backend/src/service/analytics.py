from src.repository.analytics import AnalyticsRepository
from src.schemas.analytics import (
    AnalyticsOverview,
    ClientMonthlyPoint,
    MonthlyPoint,
    RevenuePoint,
    TopClient,
    TopProduct,
)


class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository):
        self.repository = repository

    async def get_overview(self) -> AnalyticsOverview:
        totals = await self.repository.get_month_totals()
        top_products = await self.repository.get_top_products(limit=5, days=30)
        top_clients = await self.repository.get_top_clients(limit=5, days=30)
        return AnalyticsOverview(
            month_revenue=totals["revenue"],
            month_orders_count=totals["orders_count"],
            month_avg_order=totals["avg_order"],
            top_products=[TopProduct(**dict(p)) for p in top_products],
            top_clients=[TopClient(**dict(c)) for c in top_clients],
        )

    async def get_product_sales(self, product_id: int, months: int) -> list[MonthlyPoint]:
        rows = await self.repository.get_product_sales_by_month(product_id, months)
        return [MonthlyPoint(**dict(r)) for r in rows]

    async def get_client_orders(self, user_id: int, months: int) -> list[ClientMonthlyPoint]:
        rows = await self.repository.get_client_orders_by_month(user_id, months)
        return [ClientMonthlyPoint(**dict(r)) for r in rows]

    async def get_revenue_trend(self, months: int) -> list[RevenuePoint]:
        rows = await self.repository.get_revenue_by_month(months)
        return [RevenuePoint(**dict(r)) for r in rows]
