import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Category, OrderListItem, ProductAdmin, UserProfile } from "../api/types";
import { formatDateTime, formatPrice } from "../utils/format";

const LOW_STOCK_THRESHOLD = 5;

export function DashboardPage() {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newOrders, setNewOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ProductAdmin[]>("/admin/products?limit=200"),
      api.get<Category[]>("/categories"),
      api.get<UserProfile[]>("/admin/users?limit=200"),
      api.get<OrderListItem[]>("/admin/orders?status=new&limit=200"),
    ])
      .then(([p, c, u, o]) => {
        setProducts(p);
        setCategories(c);
        setUsers(u);
        setNewOrders(o);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const clients = users.filter((u) => u.role === "user");
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
          <div className="stat-card__label">Новые заказы</div>
          <div className="stat-card__value">{newOrders.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Товаров в каталоге</div>
          <div className="stat-card__value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Категорий</div>
          <div className="stat-card__value">{categories.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Клиентов</div>
          <div className="stat-card__value">{clients.length}</div>
        </div>
        <div className="stat-card stat-card--warn">
          <div className="stat-card__label">Мало на складе (≤{LOW_STOCK_THRESHOLD})</div>
          <div className="stat-card__value">{lowStock.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <section>
          <div className="page-header" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16 }}>Новые заказы</h2>
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
            <h2 style={{ fontSize: 16 }}>Заканчивается на складе</h2>
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
