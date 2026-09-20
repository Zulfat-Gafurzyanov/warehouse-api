from asyncpg.exceptions import ForeignKeyViolationError
from fastapi import HTTPException, status

from src.repository.favorite import FavoriteRepository
from src.repository.product import ProductRepository
from src.schemas.product import ProductClientListItem


class FavoriteService:
    def __init__(self, repository: FavoriteRepository, product_repository: ProductRepository):
        self.repository = repository
        self.product_repository = product_repository

    async def add(self, user_id: int, product_id: int) -> None:
        try:
            await self.repository.add(user_id, product_id)
        except ForeignKeyViolationError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Товар не найден") from e

    async def remove(self, user_id: int, product_id: int) -> None:
        removed = await self.repository.remove(user_id, product_id)
        if not removed:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Товар не в избранном")

    async def get_all(self, user_id: int, limit: int, offset: int) -> list[ProductClientListItem]:
        favorites = await self.product_repository.get_favorites(user_id, limit, offset)
        return [ProductClientListItem(**dict(f)) for f in favorites]
