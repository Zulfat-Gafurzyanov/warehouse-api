import { Fragment, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  type OrderListItem,
  type OrderOut,
  type OrderStatus,
} from "../api/types";
import { formatDateTime, formatPrice } from "../utils/format";

function statusBadgeClass(status: OrderStatus): string {
  switch (status) {
    case "new":
      return "badge--info";
    case "confirmed":
    case "processing":
      return "badge--warn";
    case "ready":
    case "delivered":
      return "badge--ok";
    case "cancelled":
      return "badge--danger";
    default:
      return "badge--muted";
  }
}

export function OrdersPage() {
  const { id: orderIdParam } = useParams<{ id: string }>();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, OrderOut>>({});
  const [detailsLoading, setDetailsLoading] = useState<number | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  function load() {
    setIsLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (statusFilter) params.set("status", statusFilter);

    api
      .get<OrderListItem[]>(`/admin/orders?${params.toString()}`)
      .then(setOrders)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить заказы"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Переход по ссылке "Открыть заказ в CRM" из Telegram-уведомления — один раз разворачиваем
  // нужный заказ и подскакиваем к нему, как только список загрузился. Флаг не даёт повторно
  // сработать при следующих перезагрузках orders (иначе повторный вызов схлопнул бы строку).
  const autoExpandedRef = useRef(false);
  useEffect(() => {
    if (!orderIdParam || isLoading || autoExpandedRef.current) return;
    const orderId = Number(orderIdParam);
    if (!orders.some((o) => o.id === orderId)) return;
    autoExpandedRef.current = true;
    toggleExpand(orderId);
    document.getElementById(`order-row-${orderId}`)?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdParam, isLoading, orders]);

  async function toggleExpand(orderId: number) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      setDetailsLoading(orderId);
      try {
        const order = await api.get<OrderOut>(`/admin/orders/${orderId}`);
        setDetails((prev) => ({ ...prev, [orderId]: order }));
      } catch {
        /* покажем как есть — строка просто не развернётся с деталями */
      } finally {
        setDetailsLoading(null);
      }
    }
  }

  async function handleStatusChange(orderId: number, status: OrderStatus) {
    setStatusUpdating(orderId);
    try {
      const updated = await api.patch<OrderOut>(`/admin/orders/${orderId}/status`, { status });
      setDetails((prev) => ({ ...prev, [orderId]: updated }));
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось изменить статус заказа");
    } finally {
      setStatusUpdating(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Заказы</h1>
          <div className="page-header__sub">{orders.length} заказов</div>
        </div>
      </div>

      <div className="toolbar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Все статусы</option>
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : error ? (
          <div className="table-error">{error}</div>
        ) : orders.length === 0 ? (
          <div className="table-empty">Заказы не найдены</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Клиент (ID)</th>
                <th>Дата</th>
                <th>Позиций</th>
                <th>Сумма</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <Fragment key={o.id}>
                  <tr
                    id={`order-row-${o.id}`}
                    onClick={() => toggleExpand(o.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>№{o.id}</td>
                    <td>#{o.user_id}</td>
                    <td>{formatDateTime(o.created_at)}</td>
                    <td>{o.item_count}</td>
                    <td>{formatPrice(o.total_amount)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.status)}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td>{expandedId === o.id ? "▲" : "▼"}</td>
                  </tr>
                  {expandedId === o.id && (
                    <tr>
                      <td colSpan={7} style={{ background: "var(--color-bg-muted)" }}>
                        {detailsLoading === o.id && <p>Загрузка позиций...</p>}
                        {details[o.id] && (
                          <div style={{ padding: "8px 0" }}>
                            <table className="data-table" style={{ marginBottom: 14 }}>
                              <tbody>
                                {details[o.id].items.map((item) => (
                                  <tr key={item.product_id}>
                                    <td>
                                      {item.product_name}{" "}
                                      <span style={{ color: "var(--color-text-muted)" }}>
                                        ({item.product_sku})
                                      </span>
                                    </td>
                                    <td>{item.quantity} шт</td>
                                    <td style={{ textAlign: "right", fontWeight: 600 }}>
                                      {formatPrice(Number(item.price) * item.quantity)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>

                            {details[o.id].comment && (
                              <p style={{ marginBottom: 14 }}>
                                <strong>Комментарий:</strong> {details[o.id].comment}
                              </p>
                            )}

                            <label className="form-field" style={{ maxWidth: 260 }}>
                              Статус заказа
                              <select
                                value={details[o.id].status}
                                disabled={statusUpdating === o.id}
                                onChange={(e) =>
                                  handleStatusChange(o.id, e.target.value as OrderStatus)
                                }
                              >
                                {ORDER_STATUS_OPTIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {ORDER_STATUS_LABELS[s]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
