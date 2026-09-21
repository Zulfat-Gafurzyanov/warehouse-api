import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, Field


class ProductImageOut(BaseModel):
    id: int
    url: str
    sort_order: int


class ProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    category_id: int
    description: str | None = None
    cost_price: Decimal = Decimal("0")
    base_price: Decimal
    stock: int = Field(default=0, ge=0)
    is_new: bool = False
    image_urls: list[str] = []


class ProductUpdate(BaseModel):
    sku: str | None = Field(default=None, min_length=1, max_length=100)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    category_id: int | None = None
    description: str | None = None
    cost_price: Decimal | None = None
    base_price: Decimal | None = None
    stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    is_new: bool | None = None
    # Если передан — полностью заменяет список фотографий товара.
    image_urls: list[str] | None = None


class ProductAdminOut(BaseModel):
    """Полное представление товара для CRM — включает себестоимость."""

    id: int
    sku: str
    name: str
    category_id: int
    description: str | None
    cost_price: Decimal
    base_price: Decimal
    stock: int
    is_active: bool
    is_new: bool
    created_at: dt.datetime
    updated_at: dt.datetime
    images: list[ProductImageOut] = []


class ProductClientOut(BaseModel):
    """Представление товара для B2B-клиента.

    Себестоимость и базовая цена намеренно отсутствуют — клиент видит только
    свою резолвленную цену (price), никогда — внутренние цифры.
    """

    id: int
    sku: str
    name: str
    category_id: int
    description: str | None
    price: Decimal
    stock: int
    is_new: bool
    images: list[ProductImageOut] = []


class ProductClientListItem(BaseModel):
    """Облегчённая карточка для листинга каталога — одно фото вместо полного списка."""

    id: int
    sku: str
    name: str
    category_id: int
    price: Decimal
    stock: int
    is_new: bool
    image_url: str | None


class StockHistoryOut(BaseModel):
    id: int
    product_id: int
    change: int
    reason: str
    order_id: int | None
    created_at: dt.datetime


class PriceHistoryOut(BaseModel):
    id: int
    product_id: int
    old_price: Decimal | None
    new_price: Decimal
    created_at: dt.datetime
