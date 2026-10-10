from fastapi import HTTPException, status

from src.repository.cost_price_item import CostPriceItemRepository
from src.schemas.cost_price_item import CostPriceItemCreate, CostPriceItemOut, CostPriceItemUpdate


def _to_out(record) -> CostPriceItemOut:
    data = dict(record)
    total_per_unit = data["unit_price"] + data["china_delivery_price"] + data["russia_delivery_price"]
    return CostPriceItemOut(
        **data,
        total_cost_per_unit=total_per_unit,
        total_cost_batch=total_per_unit * data["quantity"],
    )


class CostPriceItemService:
    def __init__(self, repository: CostPriceItemRepository):
        self.repository = repository

    async def create(self, body: CostPriceItemCreate) -> CostPriceItemOut:
        item = await self.repository.create(
            body.name, body.photo_url, body.unit_price, body.quantity,
            body.china_delivery_price, body.russia_delivery_price,
        )
        return _to_out(item)

    async def get_all(self) -> list[CostPriceItemOut]:
        items = await self.repository.get_all()
        return [_to_out(i) for i in items]

    async def update(self, item_id: int, body: CostPriceItemUpdate) -> CostPriceItemOut:
        fields = body.model_dump(exclude_unset=True)
        item = await self.repository.update(item_id, fields)
        if not item:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
        return _to_out(item)

    async def delete(self, item_id: int) -> None:
        deleted = await self.repository.delete(item_id)
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Запись не найдена")
