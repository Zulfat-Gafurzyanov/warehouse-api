from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.api.deps import get_current_admin, get_user_price_service
from src.schemas.user_price import UserPriceListItem, UserPriceOut, UserPriceSet
from src.service.user_price import UserPriceService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


# ── Индивидуальные цены клиентов ─────────────────────────


@router.put("/users/{user_id}/prices/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def set_user_product_price(
    user_id: int,
    product_id: int,
    body: UserPriceSet,
    user_price_service: Annotated[UserPriceService, Depends(get_user_price_service)],
) -> None:
    await user_price_service.set_price(user_id, product_id, body.price)


@router.get("/users/{user_id}/prices")
async def list_user_prices(
    user_id: int,
    user_price_service: Annotated[UserPriceService, Depends(get_user_price_service)],
) -> list[UserPriceOut]:
    return await user_price_service.get_all_for_user(user_id)


@router.get("/users/{user_id}/price-list")
async def get_user_price_list(
    user_id: int,
    user_price_service: Annotated[UserPriceService, Depends(get_user_price_service)],
) -> list[UserPriceListItem]:
    """Все товары с действующей ценой клиента — для страницы настройки цен."""
    return await user_price_service.get_price_list_for_user(user_id)


@router.delete("/users/{user_id}/prices/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_product_price(
    user_id: int,
    product_id: int,
    user_price_service: Annotated[UserPriceService, Depends(get_user_price_service)],
) -> None:
    await user_price_service.delete_price(user_id, product_id)
