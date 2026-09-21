from decimal import Decimal

from fastapi import HTTPException, status

from src.repository.order import InsufficientStockError, OrderRepository
from src.repository.product import ProductRepository
from src.schemas.order import OrderCreate, OrderItemOut, OrderListItem, OrderOut


class OrderService:
    def __init__(self, order_repository: OrderRepository, product_repository: ProductRepository):
        self.order_repository = order_repository
        self.product_repository = product_repository

    async def checkout(self, user_id: int, request: OrderCreate) -> OrderOut:
        product_ids = [item.product_id for item in request.items]
        rows = await self.product_repository.get_prices_for_order(user_id, product_ids)
        products_by_id = {row["id"]: row for row in rows}

        resolved_items = []
        for item in request.items:
            product = products_by_id.get(item.product_id)
            if not product or not product["is_active"]:
                raise HTTPException(status.HTTP_404_NOT_FOUND, f"Товар {item.product_id} не найден")
            if product["stock"] < item.quantity:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"Недостаточно товара «{product['name']}» на складе: "
                    f"доступно {product['stock']}, запрошено {item.quantity}",
                )
            resolved_items.append({
                "product_id": item.product_id,
                "name": product["name"],
                "sku": product["sku"],
                "price": product["price"],
                "quantity": item.quantity,
            })

        total_amount: Decimal = sum((i["price"] * i["quantity"] for i in resolved_items), Decimal("0"))

        try:
            order = await self.order_repository.create_with_items(
                user_id, request.comment, resolved_items, total_amount
            )
        except InsufficientStockError as e:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"Товар «{e.product_name}» только что раскупили — оформите заказ заново",
            ) from e

        items_out = [
            OrderItemOut(
                product_id=i["product_id"], product_name=i["name"],
                product_sku=i["sku"], quantity=i["quantity"], price=i["price"],
            )
            for i in resolved_items
        ]
        return OrderOut(**dict(order), items=items_out)

    async def get_by_id_for_user(self, order_id: int, user_id: int) -> OrderOut:
        order = await self.order_repository.get_by_id_for_user(order_id, user_id)
        if not order:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
        items = await self.order_repository.get_items(order_id)
        return OrderOut(**dict(order), items=[OrderItemOut(**dict(i)) for i in items])

    async def get_all_for_user(self, user_id: int, limit: int, offset: int) -> list[OrderListItem]:
        orders = await self.order_repository.get_all_for_user(user_id, limit, offset)
        return [OrderListItem(**dict(o)) for o in orders]

    # ── Админ ─────────────────────────────────────────────

    async def admin_get_by_id(self, order_id: int) -> OrderOut:
        order = await self.order_repository.get_by_id(order_id)
        if not order:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
        items = await self.order_repository.get_items(order_id)
        return OrderOut(**dict(order), items=[OrderItemOut(**dict(i)) for i in items])

    async def admin_get_all(
        self, limit: int, offset: int, status_filter: str | None, user_id: int | None = None
    ) -> list[OrderListItem]:
        orders = await self.order_repository.get_all(limit, offset, status_filter, user_id)
        return [OrderListItem(**dict(o)) for o in orders]

    async def admin_set_status(self, order_id: int, new_status: str) -> OrderOut:
        order = await self.order_repository.set_status(order_id, new_status)
        if not order:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Заказ не найден")
        items = await self.order_repository.get_items(order_id)
        return OrderOut(**dict(order), items=[OrderItemOut(**dict(i)) for i in items])
