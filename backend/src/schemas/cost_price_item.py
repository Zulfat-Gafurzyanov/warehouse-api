import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, Field


class CostPriceItemOut(BaseModel):
    id: int
    name: str
    photo_url: str | None
    unit_price: Decimal
    quantity: int
    china_delivery_price: Decimal
    russia_delivery_price: Decimal
    # Себестоимость одной штуки: цена + доставка по Китаю + доставка в Россию.
    total_cost_per_unit: Decimal
    # То же, умноженное на количество — себестоимость всей партии.
    total_cost_batch: Decimal
    created_at: dt.datetime
    updated_at: dt.datetime


class CostPriceItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    photo_url: str | None = None
    unit_price: Decimal = Field(default=Decimal("0"), ge=0)
    quantity: int = Field(default=0, ge=0)
    china_delivery_price: Decimal = Field(default=Decimal("0"), ge=0)
    russia_delivery_price: Decimal = Field(default=Decimal("0"), ge=0)


class CostPriceItemUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    photo_url: str | None = None
    unit_price: Decimal | None = Field(default=None, ge=0)
    quantity: int | None = Field(default=None, ge=0)
    china_delivery_price: Decimal | None = Field(default=None, ge=0)
    russia_delivery_price: Decimal | None = Field(default=None, ge=0)
