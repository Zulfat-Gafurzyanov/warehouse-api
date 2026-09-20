from typing import Annotated

from fastapi import APIRouter, Depends, status

from src.api.deps import get_current_admin, get_price_group_service, get_user_price_service
from src.schemas.price_group import (
    GroupPriceOut,
    GroupPriceSet,
    PriceGroupCreate,
    PriceGroupOut,
    PriceGroupUpdate,
)
from src.schemas.user_price import UserPriceOut, UserPriceSet
from src.service.price_group import PriceGroupService
from src.service.user_price import UserPriceService

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


# ── Ценовые группы ────────────────────────────────────────


@router.post("/price-groups", status_code=status.HTTP_201_CREATED)
async def create_price_group(
    body: PriceGroupCreate,
    price_group_service: Annotated[PriceGroupService, Depends(get_price_group_service)],
) -> PriceGroupOut:
    return await price_group_service.create(body.name)


@router.get("/price-groups")
async def list_price_groups(
    price_group_service: Annotated[PriceGroupService, Depends(get_price_group_service)],
) -> list[PriceGroupOut]:
    return await price_group_service.get_all()


@router.patch("/price-groups/{price_group_id}")
async def update_price_group(
    price_group_id: int,
    body: PriceGroupUpdate,
    price_group_service: Annotated[PriceGroupService, Depends(get_price_group_service)],
) -> PriceGroupOut:
    return await price_group_service.update_name(price_group_id, body.name)


@router.delete("/price-groups/{price_group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_price_group(
    price_group_id: int,
    price_group_service: Annotated[PriceGroupService, Depends(get_price_group_service)],
) -> None:
    await price_group_service.delete(price_group_id)


@router.put("/price-groups/{price_group_id}/prices/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def set_group_product_price(
    price_group_id: int,
    product_id: int,
    body: GroupPriceSet,
    price_group_service: Annotated[PriceGroupService, Depends(get_price_group_service)],
) -> None:
    await price_group_service.set_product_price(price_group_id, product_id, body.price)


@router.get("/price-groups/{price_group_id}/prices")
async def list_group_prices(
    price_group_id: int,
    price_group_service: Annotated[PriceGroupService, Depends(get_price_group_service)],
) -> list[GroupPriceOut]:
    return await price_group_service.get_group_prices(price_group_id)


@router.delete("/price-groups/{price_group_id}/prices/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_product_price(
    price_group_id: int,
    product_id: int,
    price_group_service: Annotated[PriceGroupService, Depends(get_price_group_service)],
) -> None:
    await price_group_service.delete_product_price(price_group_id, product_id)


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


@router.delete("/users/{user_id}/prices/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_product_price(
    user_id: int,
    product_id: int,
    user_price_service: Annotated[UserPriceService, Depends(get_user_price_service)],
) -> None:
    await user_price_service.delete_price(user_id, product_id)
