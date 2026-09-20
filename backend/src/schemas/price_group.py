import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, Field


class PriceGroupOut(BaseModel):
    id: int
    name: str
    created_at: dt.datetime
    updated_at: dt.datetime


class PriceGroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class PriceGroupUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class GroupPriceSet(BaseModel):
    price: Decimal = Field(gt=0)


class GroupPriceOut(BaseModel):
    price_group_id: int
    product_id: int
    price: Decimal
    product_name: str
    product_sku: str
