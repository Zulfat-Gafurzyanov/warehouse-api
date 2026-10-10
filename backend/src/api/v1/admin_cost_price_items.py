from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.api.deps import get_cost_price_item_service, get_current_admin
from src.schemas.cost_price_item import CostPriceItemCreate, CostPriceItemOut, CostPriceItemUpdate
from src.service.cost_price_item import CostPriceItemService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("/cost-price-items")
async def list_cost_price_items(
    service: Annotated[CostPriceItemService, Depends(get_cost_price_item_service)],
) -> list[CostPriceItemOut]:
    return await service.get_all()


@router.post("/cost-price-items", status_code=status.HTTP_201_CREATED)
async def create_cost_price_item(
    body: CostPriceItemCreate,
    service: Annotated[CostPriceItemService, Depends(get_cost_price_item_service)],
) -> CostPriceItemOut:
    return await service.create(body)


@router.patch("/cost-price-items/{item_id}")
async def update_cost_price_item(
    item_id: int,
    body: CostPriceItemUpdate,
    service: Annotated[CostPriceItemService, Depends(get_cost_price_item_service)],
) -> CostPriceItemOut:
    return await service.update(item_id, body)


@router.delete("/cost-price-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cost_price_item(
    item_id: int,
    service: Annotated[CostPriceItemService, Depends(get_cost_price_item_service)],
) -> None:
    await service.delete(item_id)
