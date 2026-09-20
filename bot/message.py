from decimal import Decimal

from schemas import OrderNotification


def _format_money(value: Decimal) -> str:
    value = value.quantize(Decimal("0.01"))
    if value == value.to_integral_value():
        formatted = f"{int(value):,}".replace(",", " ")
    else:
        formatted = f"{value:,.2f}".replace(",", " ")
    return f"{formatted} ₽"


def build_order_message(order: OrderNotification, admin_panel_url: str) -> str:
    lines = [
        f"Новый заказ №{order.order_id}",
        f"Клиент: {order.client_label}",
        f"Дата: {order.created_at.strftime('%d.%m.%Y')}",
        "",
    ]
    for item in order.items:
        lines.append(item.product_name)
        lines.append(f"{item.quantity} шт × {_format_money(item.price)} = {_format_money(item.price * item.quantity)}")
        lines.append("")

    lines.append(f"Итого: {_format_money(order.total_amount)}")

    if order.comment:
        lines.append("")
        lines.append("Комментарий:")
        lines.append(order.comment)

    if admin_panel_url:
        lines.append("")
        lines.append(f"Открыть заказ в CRM: {admin_panel_url.rstrip('/')}/orders/{order.order_id}")

    return "\n".join(lines)
