import datetime as dt
from decimal import Decimal

from pydantic import BaseModel


class OrderItemNotification(BaseModel):
    product_name: str
    quantity: int
    price: Decimal


class OrderNotification(BaseModel):
    order_id: int
    client_label: str
    created_at: dt.datetime
    comment: str | None = None
    total_amount: Decimal
    items: list[OrderItemNotification]
