from asyncpg.exceptions import ForeignKeyViolationError, UniqueViolationError
from fastapi import HTTPException, status

from src.repository.product import ProductRepository
from src.schemas.product import (
    PriceHistoryOut,
    ProductAdminOut,
    ProductClientListItem,
    ProductClientOut,
    ProductCreate,
    ProductImageOut,
    ProductUpdate,
    StockHistoryOut,
    StockReceiptCreate,
)


class ProductService:
    def __init__(self, repository: ProductRepository):
        self.repository = repository

    # ── Админ ─────────────────────────────────────────────

    async def create(self, request: ProductCreate) -> ProductAdminOut:
        try:
            product = await self.repository.create(
                sku=request.sku,
                name=request.name,
                category_id=request.category_id,
                description=request.description,
                cost_price=request.cost_price,
                base_price=request.base_price,
                stock=request.stock,
                is_new=request.is_new,
                image_urls=request.image_urls,
            )
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Товар с таким артикулом уже существует") from e
        except ForeignKeyViolationError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Указанная категория не существует") from e
        return await self._to_admin_out(product)

    async def update(self, product_id: int, request: ProductUpdate) -> ProductAdminOut:
        fields = request.model_dump(exclude_unset=True, exclude={"image_urls"})
        try:
            product = await self.repository.update(product_id, fields, request.image_urls)
        except UniqueViolationError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, "Товар с таким артикулом уже существует") from e
        except ForeignKeyViolationError as e:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Указанная категория не существует") from e
        if not product:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Товар не найден")
        return await self._to_admin_out(product)

    async def get_admin_by_id(self, product_id: int) -> ProductAdminOut:
        product = await self.repository.get_admin_by_id(product_id)
        if not product:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Товар не найден")
        return await self._to_admin_out(product)

    async def get_admin_all(
        self, limit: int, offset: int, category_id: int | None, search: str | None
    ) -> list[ProductAdminOut]:
        products = await self.repository.get_admin_all(limit, offset, category_id, search)
        return [await self._to_admin_out(p) for p in products]

    async def delete(self, product_id: int) -> None:
        try:
            deleted = await self.repository.delete(product_id)
        except ForeignKeyViolationError as e:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Нельзя удалить товар: он есть в заказах — скройте его вместо удаления",
            ) from e
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Товар не найден")

    async def receive_stock(self, product_id: int, request: StockReceiptCreate) -> ProductAdminOut:
        product = await self.repository.receive_stock(product_id, request.quantity, request.unit_cost)
        if not product:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Товар не найден")
        return await self._to_admin_out(product)

    async def get_stock_history(self, product_id: int, limit: int) -> list[StockHistoryOut]:
        rows = await self.repository.get_stock_history(product_id, limit)
        return [StockHistoryOut(**dict(r)) for r in rows]

    async def get_price_history(self, product_id: int, limit: int) -> list[PriceHistoryOut]:
        rows = await self.repository.get_price_history(product_id, limit)
        return [PriceHistoryOut(**dict(r)) for r in rows]

    async def _to_admin_out(self, product) -> ProductAdminOut:
        images = await self.repository.get_images(product["id"])
        return ProductAdminOut(
            **dict(product),
            images=[ProductImageOut(**dict(i)) for i in images],
        )

    # ── Клиент ────────────────────────────────────────────

    async def get_client_by_id(self, product_id: int, user_id: int) -> ProductClientOut:
        product = await self.repository.get_client_by_id(product_id, user_id)
        if not product:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Товар не найден")
        images = await self.repository.get_images(product["id"])
        return ProductClientOut(
            **dict(product),
            images=[ProductImageOut(**dict(i)) for i in images],
        )

    async def get_catalog(
        self,
        user_id: int,
        limit: int,
        offset: int,
        category_id: int | None,
        search: str | None,
    ) -> list[ProductClientListItem]:
        products = await self.repository.get_catalog(user_id, limit, offset, category_id, search)
        return [ProductClientListItem(**dict(p)) for p in products]
