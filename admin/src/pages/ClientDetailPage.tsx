import { Fragment, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import {
  COOPERATION_LABELS,
  ORDER_STATUS_LABELS,
  type ClientMonthlyPoint,
  type ClientProfileUpdateInput,
  type ClientStats,
  type ClientTopProduct,
  type CooperationType,
  type OrderListItem,
  type OrderOut,
  type OrderStatus,
  type PriceGroup,
  type ProductAdmin,
  type UserPrice,
  type UserProfile,
} from "../api/types";
import { BarChart } from "../components/BarChart";
import { formatDateTime, formatPrice } from "../utils/format";

interface ProfileFormState {
  login: string;
  company_name: string;
  contact_name: string;
  cooperation_type: CooperationType | "";
  price_group_id: string;
}

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

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userId = Number(id);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    login: "",
    company_name: "",
    contact_name: "",
    cooperation_type: "",
    price_group_id: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  function loadUser() {
    setIsLoading(true);
    api
      .get<UserProfile>(`/admin/users/${userId}`)
      .then((u) => {
        setUser(u);
        setProfileForm({
          login: u.login,
          company_name: u.company_name ?? "",
          contact_name: u.contact_name ?? "",
          cooperation_type: u.cooperation_type ?? "",
          price_group_id: u.price_group_id ? String(u.price_group_id) : "",
        });
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить клиента"))
      .finally(() => setIsLoading(false));
  }

  useEffect(loadUser, [userId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    api.get<PriceGroup[]>("/admin/price-groups").then(setPriceGroups).catch(() => {});
  }, []);

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      const body: ClientProfileUpdateInput = {
        login: profileForm.login,
        company_name: profileForm.company_name || null,
        contact_name: profileForm.contact_name || null,
        cooperation_type: profileForm.cooperation_type || null,
        price_group_id: profileForm.price_group_id ? Number(profileForm.price_group_id) : null,
      };
      const updated = await api.patch<UserProfile>(`/admin/users/${userId}/profile`, body);
      setUser(updated);
      setProfileSaved(true);
    } catch (e) {
      setProfileError(e instanceof ApiError ? e.message : "Не удалось сохранить профиль");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordSaved(false);
    try {
      await api.patch(`/admin/users/${userId}/password`, { password: newPassword });
      setNewPassword("");
      setPasswordSaved(true);
    } catch (e) {
      setPasswordError(e instanceof ApiError ? e.message : "Не удалось сохранить пароль");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function toggleActive() {
    if (!user) return;
    try {
      const updated = await api.patch<UserProfile>(`/admin/users/${userId}/active`, {
        is_active: !user.is_active,
      });
      setUser(updated);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось изменить статус");
    }
  }

  if (isLoading) return <p className="table-loading">Загрузка...</p>;
  if (error || !user) {
    return (
      <div>
        <p className="table-error">{error ?? "Клиент не найден"}</p>
        <Link to="/clients" className="btn btn--outline">
          Назад к клиентам
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button className="btn btn--outline btn--sm" onClick={() => navigate("/clients")} style={{ marginBottom: 16 }}>
        ← Все клиенты
      </button>

      <div className="page-header">
        <div>
          <h1>{user.company_name || user.login}</h1>
          <div className="page-header__sub">
            Логин: {user.login}
            <span className={`badge ${user.role === "admin" ? "badge--info" : "badge--muted"}`} style={{ marginLeft: 10 }}>
              {user.role === "admin" ? "Админ" : "Клиент"}
            </span>
            <span className={`badge ${user.is_active ? "badge--ok" : "badge--danger"}`} style={{ marginLeft: 6 }}>
              {user.is_active ? "Активен" : "Заблокирован"}
            </span>
          </div>
        </div>
        <button className={`btn ${user.is_active ? "btn--danger" : ""}`} onClick={toggleActive}>
          {user.is_active ? "Заблокировать" : "Разблокировать"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <section className="surface" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 15, marginBottom: 16 }}>Профиль</h2>
          <form onSubmit={handleProfileSubmit}>
            <label className="form-field">
              Логин
              <input
                value={profileForm.login}
                onChange={(e) => setProfileForm({ ...profileForm, login: e.target.value })}
                required
                minLength={3}
              />
            </label>
            <div className="form-row">
              <label className="form-field">
                Компания
                <input
                  value={profileForm.company_name}
                  onChange={(e) => setProfileForm({ ...profileForm, company_name: e.target.value })}
                />
              </label>
              <label className="form-field">
                Контактное лицо
                <input
                  value={profileForm.contact_name}
                  onChange={(e) => setProfileForm({ ...profileForm, contact_name: e.target.value })}
                />
              </label>
            </div>
            <div className="form-row">
              <label className="form-field">
                Тип сотрудничества
                <select
                  value={profileForm.cooperation_type}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, cooperation_type: e.target.value as CooperationType | "" })
                  }
                >
                  <option value="">Не указан</option>
                  {Object.entries(COOPERATION_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                Ценовая группа
                <select
                  value={profileForm.price_group_id}
                  onChange={(e) => setProfileForm({ ...profileForm, price_group_id: e.target.value })}
                >
                  <option value="">Без группы</option>
                  {priceGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {profileError && <p className="form-error">{profileError}</p>}
            {profileSaved && !profileError && (
              <p className="form-hint" style={{ color: "var(--color-primary)" }}>
                Сохранено
              </p>
            )}

            <button type="submit" className="btn" disabled={profileSaving}>
              {profileSaving ? "Сохранение..." : "Сохранить профиль"}
            </button>
          </form>

          <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid var(--color-border)" }} />

          <h3 style={{ fontSize: 14, marginBottom: 10 }}>Пароль</h3>
          <form onSubmit={handlePasswordSubmit} className="form-row" style={{ alignItems: "flex-end" }}>
            <label className="form-field" style={{ flex: 1 }}>
              Новый пароль
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                placeholder="минимум 8 символов"
              />
            </label>
            <button type="submit" className="btn btn--outline" disabled={passwordSaving} style={{ marginBottom: 16 }}>
              {passwordSaving ? "Сохранение..." : "Сбросить пароль"}
            </button>
          </form>
          {passwordError && <p className="form-error">{passwordError}</p>}
          {passwordSaved && !passwordError && (
            <p className="form-hint" style={{ color: "var(--color-primary)" }}>
              Новый пароль сохранён — сообщите его клиенту.
            </p>
          )}
        </section>

        <ClientStatsAndChart userId={userId} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <ClientFavoriteProducts userId={userId} />
        <ClientPrices userId={userId} />
      </div>

      <ClientOrderHistory userId={userId} />
    </div>
  );
}

function ClientStatsAndChart({ userId }: { userId: number }) {
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [points, setPoints] = useState<ClientMonthlyPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ClientStats>(`/admin/analytics/clients/${userId}/stats`),
      api.get<ClientMonthlyPoint[]>(`/admin/analytics/clients/${userId}/orders?months=6`),
    ])
      .then(([s, p]) => {
        setStats(s);
        setPoints(p);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <section className="surface" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 15, marginBottom: 16 }}>Статистика</h2>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-card__label">Всего заказов</div>
              <div className="stat-card__value">{stats?.orders_count ?? 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Сумма заказов</div>
              <div className="stat-card__value">{formatPrice(stats?.total_amount ?? 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Средний чек</div>
              <div className="stat-card__value">{formatPrice(stats?.avg_order ?? 0)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Куплено товаров</div>
              <div className="stat-card__value">{stats?.total_items ?? 0} шт</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Последний заказ</div>
              <div className="stat-card__value" style={{ fontSize: 15 }}>
                {stats?.last_order_at ? formatDateTime(stats.last_order_at) : "—"}
              </div>
            </div>
          </div>

          <h3 style={{ fontSize: 13, marginBottom: 4 }}>Заказы по месяцам</h3>
          <BarChart
            data={points.map((p) => ({ label: p.month.slice(2), value: Number(p.revenue) }))}
            formatValue={(v) => formatPrice(v)}
          />
        </>
      )}
    </section>
  );
}

function ClientFavoriteProducts({ userId }: { userId: number }) {
  const [products, setProducts] = useState<ClientTopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .get<ClientTopProduct[]>(`/admin/analytics/clients/${userId}/top-products?limit=8`)
      .then(setProducts)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <section>
      <h2 style={{ fontSize: 15, marginBottom: 12 }}>Любимые товары</h2>
      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : products.length === 0 ? (
          <div className="table-empty">Заказов пока не было</div>
        ) : (
          <table className="data-table">
            <tbody>
              {products.map((p) => (
                <tr key={p.product_id}>
                  <td>{p.name}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{p.quantity} шт</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function ClientPrices({ userId }: { userId: number }) {
  const [prices, setPrices] = useState<UserPrice[]>([]);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [price, setPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    Promise.all([
      api.get<UserPrice[]>(`/admin/users/${userId}/prices`),
      api.get<ProductAdmin[]>("/admin/products?limit=200"),
    ])
      .then(([p, prod]) => {
        setPrices(p);
        setProducts(prod);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить цены"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!productId || !price) {
      setFormError("Выберите товар и укажите цену");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api.put(`/admin/users/${userId}/prices/${productId}`, { price });
      setProductId("");
      setPrice("");
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Не удалось сохранить цену");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(pid: number) {
    try {
      await api.delete(`/admin/users/${userId}/prices/${pid}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось удалить цену");
    }
  }

  const availableProducts = products.filter((p) => !prices.some((pr) => pr.product_id === p.id));

  return (
    <section>
      <h2 style={{ fontSize: 15, marginBottom: 12 }}>Индивидуальные цены</h2>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : error ? (
        <div className="table-error">{error}</div>
      ) : (
        <>
          <div className="table-wrap" style={{ marginBottom: 14 }}>
            {prices.length === 0 ? (
              <div className="table-empty">Индивидуальных цен нет</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.product_id}>
                      <td>{p.product_name}</td>
                      <td style={{ fontWeight: 600 }}>{formatPrice(p.price)}</td>
                      <td style={{ textAlign: "right" }}>
                        <button className="btn btn--danger btn--sm" onClick={() => handleRemove(p.product_id)}>
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <form onSubmit={handleAdd} className="form-row" style={{ alignItems: "flex-end" }}>
            <label className="form-field">
              Товар
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="" disabled>
                  Выберите товар
                </option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              Цена, ₽
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>
            <button type="submit" className="btn" disabled={submitting} style={{ marginBottom: 16 }}>
              Добавить
            </button>
          </form>
          {formError && <p className="form-error">{formError}</p>}
        </>
      )}
    </section>
  );
}

function ClientOrderHistory({ userId }: { userId: number }) {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [details, setDetails] = useState<Record<number, OrderOut>>({});

  useEffect(() => {
    api
      .get<OrderListItem[]>(`/admin/orders?user_id=${userId}&limit=100`)
      .then(setOrders)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [userId]);

  async function toggleExpand(orderId: number) {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!details[orderId]) {
      try {
        const order = await api.get<OrderOut>(`/admin/orders/${orderId}`);
        setDetails((prev) => ({ ...prev, [orderId]: order }));
      } catch {
        /* строка просто не развернётся с деталями */
      }
    }
  }

  return (
    <section>
      <h2 style={{ fontSize: 15, marginBottom: 12 }}>История заказов</h2>
      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : orders.length === 0 ? (
          <div className="table-empty">Заказов пока нет</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>№</th>
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
                  <tr onClick={() => toggleExpand(o.id)} style={{ cursor: "pointer" }}>
                    <td>№{o.id}</td>
                    <td>{formatDateTime(o.created_at)}</td>
                    <td>{o.item_count}</td>
                    <td style={{ fontWeight: 600 }}>{formatPrice(o.total_amount)}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.status)}`}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </span>
                    </td>
                    <td>{expandedId === o.id ? "▲" : "▼"}</td>
                  </tr>
                  {expandedId === o.id && details[o.id] && (
                    <tr>
                      <td colSpan={6} style={{ background: "var(--color-bg-muted)" }}>
                        <table className="data-table" style={{ margin: "8px 0" }}>
                          <tbody>
                            {details[o.id].items.map((item) => (
                              <tr key={item.product_id}>
                                <td>
                                  {item.product_name}{" "}
                                  <span style={{ color: "var(--color-text-muted)" }}>({item.product_sku})</span>
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
                          <p style={{ margin: "0 0 8px" }}>
                            <strong>Комментарий:</strong> {details[o.id].comment}
                          </p>
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
    </section>
  );
}
