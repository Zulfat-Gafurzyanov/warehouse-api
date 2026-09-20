from asyncpg.exceptions import ForeignKeyViolationError, UniqueViolationError
from fastapi import HTTPException, status

from src.repository.category import CategoryRepository
from src.schemas.category import CategoryOut


class CategoryService:
    def __init__(self, repository: CategoryRepository):
        self.repository = repository

    async def create(self, name: str) -> CategoryOut:
        try:
            category = await self.repository.create(name)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Категория с таким названием уже существует") from e
        return CategoryOut(**dict(category))

    async def get_all(self) -> list[CategoryOut]:
        categories = await self.repository.get_all()
        return [CategoryOut(**dict(c)) for c in categories]

    async def update_name(self, category_id: int, name: str) -> CategoryOut:
        try:
            category = await self.repository.update_name(category_id, name)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Категория с таким названием уже существует") from e
        if not category:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Категория не найдена")
        return CategoryOut(**dict(category))

    async def delete(self, category_id: int) -> None:
        try:
            deleted = await self.repository.delete(category_id)
        except ForeignKeyViolationError as e:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Нельзя удалить категорию: в ней есть товары",
            ) from e
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Категория не найдена")
