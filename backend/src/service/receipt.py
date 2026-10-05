from fastapi import HTTPException, status

from src.repository.receipt import (
    ReceiptNotReversibleError,
    ReceiptProductNotFoundError,
    ReceiptRepository,
)
from src.schemas.receipt import ReceiptCreate, ReceiptItemOut, ReceiptListItem, ReceiptOut


class ReceiptService:
    def __init__(self, repository: ReceiptRepository):
        self.repository = repository

    async def create(self, admin_user_id: int, request: ReceiptCreate) -> ReceiptOut:
        items = [
            {"product_id": i.product_id, "quantity": i.quantity, "unit_cost": i.unit_cost}
            for i in request.items
        ]
        try:
            receipt_id = await self.repository.create(admin_user_id, request.comment, items)
        except ReceiptProductNotFoundError as e:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Товар с id={e.product_id} не найден",
            ) from e
        return await self.get_by_id(receipt_id)

    async def get_all(self, limit: int, offset: int) -> list[ReceiptListItem]:
        rows = await self.repository.get_all(limit, offset)
        return [ReceiptListItem(**dict(r)) for r in rows]

    async def get_by_id(self, receipt_id: int) -> ReceiptOut:
        receipt = await self.repository.get_by_id(receipt_id)
        if not receipt:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Документ приёмки не найден")
        items = await self.repository.get_items(receipt_id)
        return ReceiptOut(**dict(receipt), items=[ReceiptItemOut(**dict(i)) for i in items])

    async def delete(self, receipt_id: int) -> None:
        try:
            deleted = await self.repository.delete(receipt_id)
        except ReceiptNotReversibleError as e:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Нельзя удалить приёмку: по товару «{e.product_name}» уже были операции "
                "после неё (продажа, другая приёмка или корректировка) — откат нарушил бы "
                "историю себестоимости",
            ) from e
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Документ приёмки не найден")
