import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { GroupPrice, PriceGroup, ProductAdmin } from "../api/types";
import { Modal } from "../components/Modal";
import { formatDate, formatPrice } from "../utils/format";

export function PriceGroupsPage() {
  const [groups, setGroups] = useState<PriceGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingGroup, setEditingGroup] = useState<PriceGroup | null>(null);
  const [name, setName] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
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

  function openCreate() {
    setEditingGroup(null);
    setName("");
    setDiscountPercent("");
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(group: PriceGroup) {
    setEditingGroup(group);
    setName(group.name);
    setDiscountPercent(group.discount_percent ?? "");
    setFormError(null);
    setModalMode("edit");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const body = {
        name,
        discount_percent: discountPercent.trim() === "" ? null : Number(discountPercent),
      };
      if (modalMode === "edit" && editingGroup) {
        await api.patch(`/admin/price-groups/${editingGroup.id}`, body);
      } else {
        await api.post("/admin/price-groups", body);
      }
      setModalMode(null);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Не удалось сохранить группу");
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
        <button className="btn" onClick={openCreate}>
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
                <th>Скидка от базовой цены</th>
                <th>Создана</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td>{g.discount_percent ? `${g.discount_percent}%` : "—"}</td>
                  <td>{formatDate(g.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--outline btn--sm" onClick={() => setPricesGroup(g)}>
                        Цены товаров
                      </button>
                      <button className="btn btn--outline btn--sm" onClick={() => openEdit(g)}>
                        Изменить
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

      {modalMode && (
        <Modal
          title={modalMode === "edit" ? "Изменить ценовую группу" : "Новая ценовая группа"}
          onClose={() => setModalMode(null)}
        >
          <form onSubmit={handleSubmit}>
            <label className="form-field">
              Название
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>

            <label className="form-field">
              Скидка от базовой цены, %
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                placeholder="Например, 20"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
              />
            </label>
            <p className="form-hint" style={{ marginTop: -8 }}>
              Применяется автоматически ко всем товарам группы, для которых ниже не задана
              отдельная цена. Оставьте пустым, если группа работает только по точечным ценам.
            </p>

            {formError && <p className="form-error">{formError}</p>}

            <div className="modal__footer">
              <button type="button" className="btn btn--outline" onClick={() => setModalMode(null)}>
                Отмена
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Сохранение..." : "Сохранить"}
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
    if (!productId || !price) {
      setFormError("Выберите товар и укажите цену");
      return;
    }
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
  const discount = group.discount_percent ? Number(group.discount_percent) : null;

  function discountedPrice(basePrice: string): number {
    return Math.round(Number(basePrice) * (1 - (discount ?? 0) / 100) * 100) / 100;
  }

  return (
    <Modal title={`Цены группы «${group.name}»`} onClose={onClose} wide>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : error ? (
        <div className="table-error">{error}</div>
      ) : (
        <>
          <p className="form-hint" style={{ marginTop: 0 }}>
            {discount
              ? `Скидка группы: ${discount}% от базовой цены — уже применяется ко всем товарам ниже, для которых не задана отдельная цена.`
              : "У группы нет скидки от базовой цены — цены нужно задавать точечно для каждого товара."}
          </p>

          {prices.length === 0 ? (
            <p className="form-hint" style={{ marginTop: 0 }}>
              Индивидуальных цен для группы пока нет.
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
              <select value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="" disabled>
                  Выберите товар
                </option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                    {discount ? ` — по скидке ${formatPrice(discountedPrice(p.base_price))}` : ""}
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
    </Modal>
  );
}
