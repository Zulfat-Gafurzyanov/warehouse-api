from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_current_user_id, get_favorite_service
from src.schemas.product import ProductClientListItem
from src.service.favorite import FavoriteService

router = APIRouter(
    prefix="/favorites",
    tags=["favorites"],
    dependencies=[Depends(get_current_user_id)],
)


@router.get("")
async def list_favorites(
    user_id: Annotated[int, Depends(get_current_user_id)],
    favorite_service: Annotated[FavoriteService, Depends(get_favorite_service)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ProductClientListItem]:
    return await favorite_service.get_all(user_id, limit, offset)


@router.put("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_favorite(
    product_id: int,
    user_id: Annotated[int, Depends(get_current_user_id)],
    favorite_service: Annotated[FavoriteService, Depends(get_favorite_service)],
) -> None:
    await favorite_service.add(user_id, product_id)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    product_id: int,
    user_id: Annotated[int, Depends(get_current_user_id)],
    favorite_service: Annotated[FavoriteService, Depends(get_favorite_service)],
) -> None:
    await favorite_service.remove(user_id, product_id)
