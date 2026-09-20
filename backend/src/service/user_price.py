from asyncpg.exceptions import ForeignKeyViolationError
from fastapi import HTTPException, status

from src.repository.user_price import UserPriceRepository
from src.schemas.user_price import UserPriceOut


class UserPriceService:
    def __init__(self, repository: UserPriceRepository):
        self.repository = repository

    async def set_price(self, user_id: int, product_id: int, price) -> None:
        try:
            await self.repository.set_price(user_id, product_id, price)
        except ForeignKeyViolationError as e:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Указанный клиент или товар не существует",
            ) from e

    async def get_all_for_user(self, user_id: int) -> list[UserPriceOut]:
        prices = await self.repository.get_all_for_user(user_id)
        return [UserPriceOut(**dict(p)) for p in prices]

    async def delete_price(self, user_id: int, product_id: int) -> None:
        deleted = await self.repository.delete(user_id, product_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Индивидуальная цена не задана")
