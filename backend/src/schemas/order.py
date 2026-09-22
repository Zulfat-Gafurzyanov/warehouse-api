import datetime as dt
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    NEW = "new"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class OrderItemRequest(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)


class OrderCreate(BaseModel):
    items: list[OrderItemRequest] = Field(min_length=1)
    comment: str | None = None


class OrderItemOut(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    quantity: int
    price: Decimal


class OrderOut(BaseModel):
    id: int
    user_id: int
    status: OrderStatus
    comment: str | None
    total_amount: Decimal
    created_at: dt.datetime
    items: list[OrderItemOut]


class OrderListItem(BaseModel):
    id: int
    user_id: int
    status: OrderStatus
    total_amount: Decimal
    item_count: int
    created_at: dt.datetime
    # Заполняются только в списке для админа (get_all) — своих заказов клиенту не нужно
    # подписывать его же именем.
    client_login: str | None = None
    client_company_name: str | None = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
