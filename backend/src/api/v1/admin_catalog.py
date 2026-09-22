from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_category_service, get_current_admin, get_product_service
from src.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from src.schemas.product import (
    PriceHistoryOut,
    ProductAdminOut,
    ProductCreate,
    ProductUpdate,
    StockHistoryOut,
    StockReceiptCreate,
)
from src.service.category import CategoryService
from src.service.product import ProductService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


# ── Категории ─────────────────────────────────────────────


@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    category_service: Annotated[CategoryService, Depends(get_category_service)],
) -> CategoryOut:
    return await category_service.create(body.name)


@router.patch("/categories/{category_id}")
async def update_category(
    category_id: int,
    body: CategoryUpdate,
    category_service: Annotated[CategoryService, Depends(get_category_service)],
) -> CategoryOut:
    return await category_service.update_name(category_id, body.name)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    category_service: Annotated[CategoryService, Depends(get_category_service)],
) -> None:
    await category_service.delete(category_id)


# ── Товары ────────────────────────────────────────────────


@router.post("/products", status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    product_service: Annotated[ProductService, Depends(get_product_service)],
) -> ProductAdminOut:
    return await product_service.create(body)


@router.get("/products")
async def list_products(
    product_service: Annotated[ProductService, Depends(get_product_service)],
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ProductAdminOut]:
    return await product_service.get_admin_all(limit, offset, category_id, search)


@router.get("/products/{product_id}")
async def get_product(
    product_id: int,
    product_service: Annotated[ProductService, Depends(get_product_service)],
) -> ProductAdminOut:
    return await product_service.get_admin_by_id(product_id)


@router.patch("/products/{product_id}")
async def update_product(
    product_id: int,
    body: ProductUpdate,
    product_service: Annotated[ProductService, Depends(get_product_service)],
) -> ProductAdminOut:
    return await product_service.update(product_id, body)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    product_service: Annotated[ProductService, Depends(get_product_service)],
) -> None:
    await product_service.delete(product_id)


@router.post("/products/{product_id}/receipts")
async def receive_product_stock(
    product_id: int,
    body: StockReceiptCreate,
    product_service: Annotated[ProductService, Depends(get_product_service)],
) -> ProductAdminOut:
    return await product_service.receive_stock(product_id, body)


@router.get("/products/{product_id}/stock-history")
async def get_product_stock_history(
    product_id: int,
    product_service: Annotated[ProductService, Depends(get_product_service)],
    limit: int = Query(default=50, ge=1, le=200),
) -> list[StockHistoryOut]:
    return await product_service.get_stock_history(product_id, limit)


@router.get("/products/{product_id}/price-history")
async def get_product_price_history(
    product_id: int,
    product_service: Annotated[ProductService, Depends(get_product_service)],
    limit: int = Query(default=50, ge=1, le=200),
) -> list[PriceHistoryOut]:
    return await product_service.get_price_history(product_id, limit)
