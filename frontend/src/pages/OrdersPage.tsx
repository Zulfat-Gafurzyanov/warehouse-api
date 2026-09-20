import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import { ORDER_STATUS_LABELS, type OrderListItem, type OrderOut } from "../api/types";
import { formatPrice } from "../utils/format";
import "./OrdersPage.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, OrderOut>>({});
  const [detailsLoading, setDetailsLoading] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<OrderListItem[]>("/orders?limit=100")
      .then(setOrders)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить заказы"))
      .finally(() => setIsLoading(false));
  }, []);

  async function toggleExpand(orderId: number) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      setDetailsLoading(orderId);
      try {
        const order = await api.get<OrderOut>(`/orders/${orderId}`);
        setDetails((prev) => ({ ...prev, [orderId]: order }));
      } catch {
        /* ошибку покажем прямо в раскрытой карточке ниже */
      } finally {
        setDetailsLoading(null);
      }
    }
  }

  if (isLoading) return <p className="orders-page__loading container">Загрузка...</p>;
  if (error) return <p className="orders-page__error container">{error}</p>;

  return (
    <div className="orders-page">
      <div className="container">
        <h1>Мои заказы</h1>

        {orders.length === 0 ? (
          <p className="orders-page__empty">У вас пока нет заказов.</p>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="order-card">
                <button className="order-card__summary" onClick={() => toggleExpand(order.id)}>
                  <div>
                    <div className="order-card__number">Заказ №{order.id}</div>
                    <div className="order-card__date">{formatDate(order.created_at)}</div>
                  </div>
                  <div className="order-card__meta">
                    <span className="order-card__count">{order.item_count} позиций</span>
                    <span className={`order-card__status order-card__status--${order.status}`}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    <span className="order-card__total">{formatPrice(order.total_amount)}</span>
                  </div>
                </button>

                {expandedId === order.id && (
                  <div className="order-card__details">
                    {detailsLoading === order.id && <p>Загрузка позиций...</p>}
                    {details[order.id] && (
                      <>
                        <table className="order-card__items">
                          <tbody>
                            {details[order.id].items.map((item) => (
                              <tr key={item.product_id}>
                                <td>{item.product_name}</td>
                                <td className="order-card__items-qty">{item.quantity} шт</td>
                                <td className="order-card__items-price">
                                  {formatPrice(Number(item.price) * item.quantity)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {details[order.id].comment && (
                          <p className="order-card__comment">
                            <strong>Комментарий:</strong> {details[order.id].comment}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
