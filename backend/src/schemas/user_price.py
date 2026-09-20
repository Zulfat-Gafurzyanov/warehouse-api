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
