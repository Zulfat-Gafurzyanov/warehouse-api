import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { BarChart } from "../components/BarChart";
import type {
  AnalyticsOverview,
  OrderListItem,
  ProductAdmin,
  RevenuePoint,
} from "../api/types";
import { formatDateTime, formatPrice } from "../utils/format";

const LOW_STOCK_THRESHOLD = 5;

export function DashboardPage() {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [newOrders, setNewOrders] = useState<OrderListItem[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ProductAdmin[]>("/admin/products?limit=200"),
      api.get<OrderListItem[]>("/admin/orders?status=new&limit=200"),
      api.get<AnalyticsOverview>("/admin/analytics/overview"),
      api.get<RevenuePoint[]>("/admin/analytics/revenue?months=6"),
    ])
      .then(([p, o, ov, rev]) => {
        setProducts(p);
        setNewOrders(o);
        setOverview(ov);
        setRevenueTrend(rev);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const lowStock = products.filter((p) => p.is_active && p.stock <= LOW_STOCK_THRESHOLD);

  if (isLoading) return <p className="table-loading">Загрузка...</p>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Дашборд</h1>
          <div className="page-header__sub">Быстрый обзор текущего состояния</div>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-card__label">Выручка за месяц</div>
          <div className="stat-card__value">{formatPrice(overview?.month_revenue ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Заказов за месяц</div>
          <div className="stat-card__value">{overview?.month_orders_count ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Средний чек</div>
          <div className="stat-card__value">{formatPrice(overview?.month_avg_order ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Новые заказы</div>
          <div className="stat-card__value">{newOrders.length}</div>
        </div>
        <div className="stat-card stat-card--warn">
          <div className="stat-card__label">Мало на складе (≤{LOW_STOCK_THRESHOLD})</div>
          <div className="stat-card__value">{lowStock.length}</div>
        </div>
      </div>

      <div className="surface" style={{ padding: "18px 20px", marginBottom: 32 }}>
        <h2 style={{ fontSize: 15, marginBottom: 4 }}>Выручка по месяцам</h2>
        <BarChart
          data={revenueTrend.map((p) => ({ label: p.month.slice(2), value: Number(p.revenue) }))}
          formatValue={(v) => formatPrice(v)}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <section>
          <h2 style={{ fontSize: 15, marginBottom: 12 }}>Топ товаров (30 дней)</h2>
          <div className="table-wrap">
            {!overview || overview.top_products.length === 0 ? (
              <div className="table-empty">Продаж пока нет</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {overview.top_products.map((p) => (
                    <tr key={p.product_id}>
                      <td>{p.name}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{p.quantity} шт</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{formatPrice(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 15, marginBottom: 12 }}>Топ клиентов (30 дней)</h2>
          <div className="table-wrap">
            {!overview || overview.top_clients.length === 0 ? (
              <div className="table-empty">Заказов пока нет</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {overview.top_clients.map((c) => (
                    <tr key={c.user_id}>
                      <td>{c.company_name || c.email}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{c.orders_count} зак.</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{formatPrice(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <section>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 15 }}>Новые заказы</h2>
            <Link to="/orders" className="btn btn--outline btn--sm">
              Все заказы
            </Link>
          </div>
          <div className="table-wrap">
            {newOrders.length === 0 ? (
              <div className="table-empty">Новых заказов нет</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {newOrders.slice(0, 8).map((o) => (
                    <tr key={o.id}>
                      <td>№{o.id}</td>
                      <td>{formatDateTime(o.created_at)}</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatPrice(o.total_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 15 }}>Заканчивается на складе</h2>
            <Link to="/products" className="btn btn--outline btn--sm">
              Все товары
            </Link>
          </div>
          <div className="table-wrap">
            {lowStock.length === 0 ? (
              <div className="table-empty">Всё в достатке</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {lowStock.slice(0, 8).map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td style={{ textAlign: "right" }}>
                        <span className="badge badge--warn">{p.stock} шт</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
