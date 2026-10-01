from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_current_admin, get_order_service
from src.schemas.order import (
    OrderCommentUpdate,
    OrderListItem,
    OrderOut,
    OrderStatus,
    OrderStatusUpdate,
)
from src.service.order import OrderService

router = APIRouter(
    prefix="/admin/orders",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.get("")
async def list_orders(
    order_service: Annotated[OrderService, Depends(get_order_service)],
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    user_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[OrderListItem]:
    return await order_service.admin_get_all(
        limit, offset, status_filter.value if status_filter else None, user_id
    )


@router.get("/{order_id}")
async def get_order(
    order_id: int,
    order_service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderOut:
    return await order_service.admin_get_by_id(order_id)


@router.patch("/{order_id}/status")
async def set_order_status(
    order_id: int,
    body: OrderStatusUpdate,
    order_service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderOut:
    return await order_service.admin_set_status(order_id, body.status.value)


@router.patch("/{order_id}/comment")
async def update_order_comment(
    order_id: int,
    body: OrderCommentUpdate,
    order_service: Annotated[OrderService, Depends(get_order_service)],
) -> OrderOut:
    return await order_service.admin_update_comment(order_id, body.comment)


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(
    order_id: int,
    order_service: Annotated[OrderService, Depends(get_order_service)],
) -> None:
    """Удаляет случайный/ненужный заказ и возвращает списанный остаток на склад —
    заказ никогда не был реальной отгрузкой, поэтому его стоит убрать из статистики целиком."""
    await order_service.admin_delete(order_id)
