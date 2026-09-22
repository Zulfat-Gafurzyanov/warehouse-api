import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { BarChart } from "../components/BarChart";
import type {
  AnalyticsOverview,
  OrderListItem,
  ProductAdmin,
  RevenuePoint,
  StaleProduct,
  TurnoverItem,
} from "../api/types";
import { formatDateTime, formatPrice } from "../utils/format";

const LOW_STOCK_THRESHOLD = 5;

export function DashboardPage() {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [newOrders, setNewOrders] = useState<OrderListItem[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [revenueTrend, setRevenueTrend] = useState<RevenuePoint[]>([]);
  const [turnover, setTurnover] = useState<TurnoverItem[]>([]);
  const [staleProducts, setStaleProducts] = useState<StaleProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ProductAdmin[]>("/admin/products?limit=200"),
      api.get<OrderListItem[]>("/admin/orders?status=new&limit=200"),
      api.get<AnalyticsOverview>("/admin/analytics/overview"),
      api.get<RevenuePoint[]>("/admin/analytics/revenue?months=6"),
      api.get<TurnoverItem[]>("/admin/analytics/turnover?limit=8"),
      api.get<StaleProduct[]>("/admin/analytics/stale-products?days=30&limit=8"),
    ])
      .then(([p, o, ov, rev, turn, stale]) => {
        setProducts(p);
        setNewOrders(o);
        setOverview(ov);
        setRevenueTrend(rev);
        setTurnover(turn);
        setStaleProducts(stale);
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
          <div className="stat-card__label">Продано единиц</div>
          <div className="stat-card__value">{overview?.month_units_sold ?? 0} шт</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Средний чек</div>
          <div className="stat-card__value">{formatPrice(overview?.month_avg_order ?? 0)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Рентабельность за месяц</div>
          <div className="stat-card__value">
            {overview ? `${Number(overview.month_margin_percent).toFixed(1)}%` : "—"}
          </div>
          <div className="stat-card__sub">{formatPrice(overview?.month_margin ?? 0)} прибыли</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Новые заказы</div>
          <div className="stat-card__value">{newOrders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Товара на складе</div>
          <div className="stat-card__value">{overview?.total_stock ?? 0} шт</div>
          <div className="stat-card__sub">{overview?.active_products_count ?? 0} активных SKU</div>
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
                      <td>{c.company_name || c.login}</td>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <section>
          <h2 style={{ fontSize: 15, marginBottom: 12 }}>Оборачиваемость (топ по продажам за 30 дней)</h2>
          <div className="table-wrap">
            {turnover.length === 0 ? (
              <div className="table-empty">Продаж пока нет</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Товар</th>
                    <th>Остаток</th>
                    <th>7д</th>
                    <th>30д</th>
                    <th>90д</th>
                  </tr>
                </thead>
                <tbody>
                  {turnover.map((t) => (
                    <tr key={t.product_id}>
                      <td>
                        {t.name}{" "}
                        <span style={{ color: "var(--color-text-muted)" }}>({t.sku})</span>
                      </td>
                      <td>{t.stock} шт</td>
                      <td>{t.sold_7d} шт</td>
                      <td>{t.sold_30d} шт</td>
                      <td>{t.sold_90d} шт</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 15, marginBottom: 12 }}>Давно не продаются (30+ дней)</h2>
          <div className="table-wrap">
            {staleProducts.length === 0 ? (
              <div className="table-empty">Все товары продаются регулярно</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {staleProducts.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        {p.name}{" "}
                        <span style={{ color: "var(--color-text-muted)" }}>({p.sku})</span>
                      </td>
                      <td style={{ color: "var(--color-text-muted)" }}>{p.stock} шт</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {p.last_sold_at ? formatDateTime(p.last_sold_at) : "никогда не продавался"}
                      </td>
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
