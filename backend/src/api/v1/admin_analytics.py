from typing import Annotated

from fastapi import APIRouter, Depends, Query

from src.api.deps import get_analytics_service, get_current_admin
from src.schemas.analytics import (
    AnalyticsOverview,
    ClientMonthlyPoint,
    ClientStats,
    ClientTopProduct,
    MonthlyPoint,
    RevenuePoint,
)
from src.service.analytics import AnalyticsService

router = APIRouter(
    prefix="/admin/analytics",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/overview")
async def get_overview(
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> AnalyticsOverview:
    return await analytics_service.get_overview()


@router.get("/revenue")
async def get_revenue_trend(
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    months: int = Query(default=6, ge=1, le=24),
) -> list[RevenuePoint]:
    return await analytics_service.get_revenue_trend(months)


@router.get("/products/{product_id}/sales")
async def get_product_sales(
    product_id: int,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    months: int = Query(default=6, ge=1, le=24),
) -> list[MonthlyPoint]:
    return await analytics_service.get_product_sales(product_id, months)


@router.get("/clients/{user_id}/orders")
async def get_client_orders(
    user_id: int,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    months: int = Query(default=6, ge=1, le=24),
) -> list[ClientMonthlyPoint]:
    return await analytics_service.get_client_orders(user_id, months)


@router.get("/clients/{user_id}/stats")
async def get_client_stats(
    user_id: int,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
) -> ClientStats:
    return await analytics_service.get_client_stats(user_id)


@router.get("/clients/{user_id}/top-products")
async def get_client_top_products(
    user_id: int,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    limit: int = Query(default=5, ge=1, le=20),
) -> list[ClientTopProduct]:
    return await analytics_service.get_client_top_products(user_id, limit)
