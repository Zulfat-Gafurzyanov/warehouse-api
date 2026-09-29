from decimal import Decimal

from pydantic import BaseModel, Field


class UserPriceSet(BaseModel):
    price: Decimal = Field(gt=0)


class UserPriceOut(BaseModel):
    user_id: int
    product_id: int
    price: Decimal
    product_name: str
    product_sku: str


class UserPriceListItem(BaseModel):
    """Строка полного списка товаров для настройки цен клиента: действующая цена = либо
    индивидуальная (is_custom), либо базовая цена товара."""

    product_id: int
    product_sku: str
    product_name: str
    image_url: str | None
    stock: int
    base_price: Decimal
    price: Decimal
    is_custom: bool
