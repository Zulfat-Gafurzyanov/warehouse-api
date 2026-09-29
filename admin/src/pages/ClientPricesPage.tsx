import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import {
  COOPERATION_LABELS,
  type CooperationType,
  type UserPriceListItem,
  type UserProfile,
} from "../api/types";
import { Modal } from "../components/Modal";
import { formatPrice } from "../utils/format";

function cooperationBadgeClass(type: CooperationType): string {
  return type === "buyout" ? "badge--ok" : "badge--warn";
}

// Только цифры и один разделитель (точка или запятая), максимум 2 знака после него —
// это <input type="text">, а не type="number", чтобы браузер не «съедал» конечные нули.
const DECIMAL_INPUT_RE = /^[0-9]*[.,]?[0-9]{0,2}$/;

export function ClientPricesPage() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [items, setItems] = useState<UserPriceListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [rowBusy, setRowBusy] = useState<Record<number, boolean>>({});
  const [rowError, setRowError] = useState<Record<number, string>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    Promise.all([
      api.get<UserProfile>(`/admin/users/${userId}`),
      api.get<UserPriceListItem[]>(`/admin/users/${userId}/price-list`),
    ])
      .then(([u, list]) => {
        setUser(u);
        setItems(list);
        setDrafts(Object.fromEntries(list.map((i) => [i.product_id, i.price])));
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить цены"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateDraft(productId: number, raw: string) {
    if (!DECIMAL_INPUT_RE.test(raw)) return;
    setDrafts((prev) => ({ ...prev, [productId]: raw }));
  }

  async function handleSave(item: UserPriceListItem) {
    const value = drafts[item.product_id];
    if (!value) return;
    setRowBusy((prev) => ({ ...prev, [item.product_id]: true }));
    setRowError((prev) => ({ ...prev, [item.product_id]: "" }));
    try {
      await api.put(`/admin/users/${userId}/prices/${item.product_id}`, {
        price: value.replace(",", "."),
      });
      load();
    } catch (e) {
      setRowError((prev) => ({
        ...prev,
        [item.product_id]: e instanceof ApiError ? e.message : "Не удалось сохранить цену",
      }));
    } finally {
      setRowBusy((prev) => ({ ...prev, [item.product_id]: false }));
    }
  }

  async function handleReset(item: UserPriceListItem) {
    setRowBusy((prev) => ({ ...prev, [item.product_id]: true }));
    try {
      await api.delete(`/admin/users/${userId}/prices/${item.product_id}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось сбросить цену");
    } finally {
      setRowBusy((prev) => ({ ...prev, [item.product_id]: false }));
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

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(
        (i) => i.product_name.toLowerCase().includes(q) || i.product_sku.toLowerCase().includes(q),
      )
    : items;
  const missingCount = items.filter((i) => !i.is_custom).length;
  const isConsignment = user.cooperation_type === "consignment";

  return (
    <div>
      <Link
        to={`/clients/${userId}`}
        className="btn btn--outline btn--sm"
        style={{ marginBottom: 16, display: "inline-block" }}
      >
        ← Назад к клиенту
      </Link>

      <div className="page-header">
        <div>
          <h1>Цены — {user.company_name || user.login}</h1>
          <div className="page-header__sub">
            {items.length} товаров
            {user.cooperation_type && (
              <span className={`badge ${cooperationBadgeClass(user.cooperation_type)}`} style={{ marginLeft: 10 }}>
                {COOPERATION_LABELS[user.cooperation_type]}
              </span>
            )}
          </div>
        </div>
      </div>

      {isConsignment && missingCount > 0 && (
        <p className="form-hint" style={{ marginTop: 0, color: "#9c6a10" }}>
          Не задано индивидуальных цен: {missingCount} из {items.length} — по этим товарам клиент
          увидит базовую цену, если ничего не изменить.
        </p>
      )}

      <input
        type="search"
        placeholder="Поиск по названию или артикулу"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 16, width: "100%", maxWidth: 360 }}
      />

      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div className="table-empty">Товары не найдены</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Товар</th>
                <th>Остаток</th>
                <th>Базовая цена</th>
                <th>Цена клиента</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.product_id}
                  style={isConsignment && !item.is_custom ? { background: "var(--color-bg-muted)" } : undefined}
                >
                  <td>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="receipt-line-thumb"
                        onClick={() => setZoomedImage(item.image_url)}
                      />
                    ) : (
                      <div className="receipt-line-thumb receipt-line-thumb--empty" />
                    )}
                  </td>
                  <td>
                    {item.product_name}{" "}
                    <span style={{ color: "var(--color-text-muted)" }}>({item.product_sku})</span>
                  </td>
                  <td>{item.stock} шт</td>
                  <td>{formatPrice(item.base_price)}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={drafts[item.product_id] ?? ""}
                      onChange={(e) => updateDraft(item.product_id, e.target.value)}
                      style={{ width: 100 }}
                    />
                    {item.is_custom && (
                      <span className="badge badge--info" style={{ marginLeft: 8 }}>
                        индивидуальная
                      </span>
                    )}
                    {rowError[item.product_id] && (
                      <p className="form-error" style={{ margin: "4px 0 0" }}>
                        {rowError[item.product_id]}
                      </p>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn btn--sm"
                      disabled={rowBusy[item.product_id]}
                      onClick={() => handleSave(item)}
                    >
                      Сохранить
                    </button>
                    {item.is_custom && (
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        style={{ marginLeft: 6 }}
                        disabled={rowBusy[item.product_id]}
                        onClick={() => handleReset(item)}
                      >
                        Сбросить
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {zoomedImage && (
        <Modal title="Фото товара" onClose={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
        </Modal>
      )}
    </div>
  );
}
