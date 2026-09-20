import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { GroupPrice, PriceGroup, ProductAdmin } from "../api/types";
import { Modal } from "../components/Modal";
import { formatDate, formatPrice } from "../utils/format";

export function PriceGroupsPage() {
  const [groups, setGroups] = useState<PriceGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [pricesGroup, setPricesGroup] = useState<PriceGroup | null>(null);

  function load() {
    setIsLoading(true);
    api
      .get<PriceGroup[]>("/admin/price-groups")
      .then(setGroups)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить группы"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/admin/price-groups", { name });
      setCreateOpen(false);
      setName("");
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Не удалось создать группу");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(group: PriceGroup) {
    if (!confirm(`Удалить группу «${group.name}»?`)) return;
    try {
      await api.delete(`/admin/price-groups/${group.id}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось удалить группу");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Ценовые группы</h1>
          <div className="page-header__sub">Опт1, Опт2, VIP и т.д. — быстрое назначение цен группе клиентов</div>
        </div>
        <button className="btn" onClick={() => setCreateOpen(true)}>
          + Новая группа
        </button>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : error ? (
          <div className="table-error">{error}</div>
        ) : groups.length === 0 ? (
          <div className="table-empty">Ценовых групп пока нет</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Создана</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{formatDate(g.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--outline btn--sm" onClick={() => setPricesGroup(g)}>
                        Цены товаров
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(g)}>
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {createOpen && (
        <Modal title="Новая ценовая группа" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate}>
            <label className="form-field">
              Название
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="modal__footer">
              <button type="button" className="btn btn--outline" onClick={() => setCreateOpen(false)}>
                Отмена
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Создание..." : "Создать"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pricesGroup && (
        <GroupPricesModal group={pricesGroup} onClose={() => setPricesGroup(null)} />
      )}
    </div>
  );
}

function GroupPricesModal({ group, onClose }: { group: PriceGroup; onClose: () => void }) {
  const [prices, setPrices] = useState<GroupPrice[]>([]);
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
      api.get<GroupPrice[]>(`/admin/price-groups/${group.id}/prices`),
      api.get<ProductAdmin[]>("/admin/products?limit=200"),
    ])
      .then(([p, prod]) => {
        setPrices(p);
        setProducts(prod);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить цены"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [group.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!productId || !price) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.put(`/admin/price-groups/${group.id}/prices/${productId}`, { price });
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
      await api.delete(`/admin/price-groups/${group.id}/prices/${pid}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось удалить цену");
    }
  }

  const availableProducts = products.filter((p) => !prices.some((pr) => pr.product_id === p.id));

  return (
    <Modal title={`Цены группы «${group.name}»`} onClose={onClose} wide>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : error ? (
        <div className="table-error">{error}</div>
      ) : (
        <>
          {prices.length === 0 ? (
            <p className="form-hint" style={{ marginTop: 0 }}>
              Цен для этой группы пока нет.
            </p>
          ) : (
            <table className="data-table" style={{ marginBottom: 20 }}>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Артикул</th>
                  <th>Цена</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.product_id}>
                    <td>{p.product_name}</td>
                    <td>{p.product_sku}</td>
                    <td>{formatPrice(p.price)}</td>
                    <td>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleRemove(p.product_id)}
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <form onSubmit={handleAdd} className="form-row" style={{ alignItems: "flex-end" }}>
            <label className="form-field">
              Товар
              <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
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
                required
              />
            </label>
            <button type="submit" className="btn" disabled={submitting} style={{ marginBottom: 16 }}>
              Добавить
            </button>
          </form>

          {formError && <p className="form-error">{formError}</p>}
        </>
      )}
    </Modal>
  );
}
