from typing import Annotated

from fastapi import APIRouter, Depends, Query

from src.api.deps import get_category_service, get_current_user_id, get_product_service
from src.schemas.category import CategoryOut
from src.schemas.product import ProductClientListItem, ProductClientOut
from src.service.category import CategoryService
from src.service.product import ProductService

router = APIRouter(
    tags=["catalog"],
    dependencies=[Depends(get_current_user_id)],
)


@router.get("/categories")
async def list_categories(
    category_service: Annotated[CategoryService, Depends(get_category_service)],
) -> list[CategoryOut]:
    return await category_service.get_all()


@router.get("/products")
async def list_products(
    user_id: Annotated[int, Depends(get_current_user_id)],
    product_service: Annotated[ProductService, Depends(get_product_service)],
    category_id: int | None = Query(default=None),
    search: str | None = Query(default=None, min_length=1, max_length=255),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ProductClientListItem]:
    return await product_service.get_catalog(user_id, limit, offset, category_id, search)


@router.get("/products/{product_id}")
async def get_product(
    product_id: int,
    user_id: Annotated[int, Depends(get_current_user_id)],
    product_service: Annotated[ProductService, Depends(get_product_service)],
) -> ProductClientOut:
    return await product_service.get_client_by_id(product_id, user_id)
