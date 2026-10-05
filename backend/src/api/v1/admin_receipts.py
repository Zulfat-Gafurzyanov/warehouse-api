from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from src.api.deps import get_current_admin, get_receipt_service
from src.schemas.receipt import ReceiptCreate, ReceiptListItem, ReceiptOut
from src.service.receipt import ReceiptService

router = APIRouter(
    prefix="/admin/receipts",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_receipt(
    body: ReceiptCreate,
    admin_user_id: Annotated[int, Depends(get_current_admin)],
    receipt_service: Annotated[ReceiptService, Depends(get_receipt_service)],
) -> ReceiptOut:
    return await receipt_service.create(admin_user_id, body)


@router.get("")
async def list_receipts(
    receipt_service: Annotated[ReceiptService, Depends(get_receipt_service)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> list[ReceiptListItem]:
    return await receipt_service.get_all(limit, offset)


@router.get("/{receipt_id}")
async def get_receipt(
    receipt_id: int,
    receipt_service: Annotated[ReceiptService, Depends(get_receipt_service)],
) -> ReceiptOut:
    return await receipt_service.get_by_id(receipt_id)


@router.delete("/{receipt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_receipt(
    receipt_id: int,
    receipt_service: Annotated[ReceiptService, Depends(get_receipt_service)],
) -> None:
    """Откатывает приёмку — только если по каждому её товару это было последнее движение
    остатка, иначе 409 (нельзя честно пересчитать себестоимость задним числом)."""
    await receipt_service.delete(receipt_id)
