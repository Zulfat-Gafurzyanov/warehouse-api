from asyncpg.exceptions import ForeignKeyViolationError, UniqueViolationError
from fastapi import HTTPException, status

from src.repository.group_price import GroupPriceRepository
from src.repository.price_group import PriceGroupRepository
from src.schemas.price_group import GroupPriceOut, PriceGroupOut


class PriceGroupService:
    def __init__(self, repository: PriceGroupRepository, group_price_repository: GroupPriceRepository):
        self.repository = repository
        self.group_price_repository = group_price_repository

    async def create(self, name: str) -> PriceGroupOut:
        try:
            group = await self.repository.create(name)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ценовая группа с таким названием уже существует") from e
        return PriceGroupOut(**dict(group))

    async def get_all(self) -> list[PriceGroupOut]:
        groups = await self.repository.get_all()
        return [PriceGroupOut(**dict(g)) for g in groups]

    async def update_name(self, price_group_id: int, name: str) -> PriceGroupOut:
        try:
            group = await self.repository.update_name(price_group_id, name)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ценовая группа с таким названием уже существует") from e
        if not group:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ценовая группа не найдена")
        return PriceGroupOut(**dict(group))

    async def delete(self, price_group_id: int) -> None:
        try:
            deleted = await self.repository.delete(price_group_id)
        except ForeignKeyViolationError as e:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Нельзя удалить группу: она назначена клиентам или для неё заданы цены",
            ) from e
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ценовая группа не найдена")

    # ── Цены группы на товары ─────────────────────────────

    async def set_product_price(self, price_group_id: int, product_id: int, price) -> None:
        try:
            await self.group_price_repository.set_price(price_group_id, product_id, price)
        except ForeignKeyViolationError as e:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Указанная ценовая группа или товар не существует",
            ) from e

    async def get_group_prices(self, price_group_id: int) -> list[GroupPriceOut]:
        prices = await self.group_price_repository.get_all_for_group(price_group_id)
        return [GroupPriceOut(**dict(p)) for p in prices]

    async def delete_product_price(self, price_group_id: int, product_id: int) -> None:
        deleted = await self.group_price_repository.delete(price_group_id, product_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Цена для этого товара в группе не задана")
