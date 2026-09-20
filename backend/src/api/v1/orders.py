from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_current_user_id, get_order_service
from src.schemas.order import OrderCreate, OrderListItem, OrderOut
from src.service.order import OrderService

router = APIRouter(
    prefix="/orders",
    tags=["orders"],
    dependencies=[Depends(get_current_user_id)],
)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_order(
    body: OrderCreate,
    user_id: Annotated[int, Depends(get_current_user_id)],
    order_service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderOut:
    return await order_service.checkout(user_id, body)


@router.get("")
async def list_orders(
    user_id: Annotated[int, Depends(get_current_user_id)],
    order_service: Annotated[OrderService, Depends(get_order_service)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[OrderListItem]:
    return await order_service.get_all_for_user(user_id, limit, offset)


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    user_id: Annotated[int, Depends(get_current_user_id)],
    order_service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderOut:
    return await order_service.get_by_id_for_user(order_id, user_id)
