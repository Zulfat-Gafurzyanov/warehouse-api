import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, Field


class ReceiptItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(gt=0)
    unit_cost: Decimal = Field(ge=0)


class ReceiptCreate(BaseModel):
    comment: str | None = None
    items: list[ReceiptItemCreate] = Field(min_length=1)


class ReceiptItemOut(BaseModel):
    product_id: int
    product_name: str
    product_sku: str
    image_url: str | None = None
    quantity: int
    unit_cost: Decimal


class ReceiptOut(BaseModel):
    id: int
    comment: str | None
    created_at: dt.datetime
    items: list[ReceiptItemOut]


class ReceiptListItem(BaseModel):
    id: int
    comment: str | None
    created_at: dt.datetime
    item_count: int
    total_quantity: int
    total_cost: Decimal
