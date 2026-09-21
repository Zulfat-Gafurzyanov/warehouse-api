import datetime as dt
from decimal import Decimal

from pydantic import BaseModel


class TopProduct(BaseModel):
    product_id: int
    name: str
    quantity: int
    revenue: Decimal


class TopClient(BaseModel):
    user_id: int
    login: str
    company_name: str | None
    revenue: Decimal
    orders_count: int


class ClientStats(BaseModel):
    orders_count: int
    total_amount: Decimal
    last_order_at: dt.datetime | None


class ClientTopProduct(BaseModel):
    product_id: int
    name: str
    quantity: int


class AnalyticsOverview(BaseModel):
    """За текущий календарный месяц, плюс топы за последние 30 дней."""

    month_revenue: Decimal
    month_orders_count: int
    month_avg_order: Decimal
    top_products: list[TopProduct]
    top_clients: list[TopClient]


class MonthlyPoint(BaseModel):
    month: str  # "YYYY-MM"
    quantity: int
    revenue: Decimal


class ClientMonthlyPoint(BaseModel):
    month: str  # "YYYY-MM"
    orders_count: int
    revenue: Decimal


class RevenuePoint(BaseModel):
    month: str  # "YYYY-MM"
    revenue: Decimal
    orders_count: int
