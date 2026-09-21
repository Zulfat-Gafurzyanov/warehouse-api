import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type {
  Category,
  MonthlyPoint,
  PriceHistoryEntry,
  ProductAdmin,
  ProductCreateInput,
  ProductUpdateInput,
  StockHistoryEntry,
} from "../api/types";
import { BarChart } from "../components/BarChart";
import { Modal } from "../components/Modal";
import { formatDateTime, formatPrice } from "../utils/format";

interface FormState {
  sku: string;
  name: string;
  category_id: string;
  description: string;
  cost_price: string;
  base_price: string;
  stock: string;
  is_new: boolean;
  is_active: boolean;
  image_urls: string;
}

const EMPTY_FORM: FormState = {
  sku: "",
  name: "",
  category_id: "",
  description: "",
  cost_price: "0",
  base_price: "",
  stock: "0",
  is_new: false,
  is_active: true,
  image_urls: "",
};

export function ProductsPage() {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [editingProduct, setEditingProduct] = useState<ProductAdmin | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [historyProduct, setHistoryProduct] = useState<ProductAdmin | null>(null);

  function load() {
    setIsLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (categoryFilter) params.set("category_id", categoryFilter);
    if (search.trim()) params.set("search", search.trim());

    api
      .get<ProductAdmin[]>(`/admin/products?${params.toString()}`)
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить товары"))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    api.get<Category[]>("/categories").then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: number) => map.get(id) ?? `#${id}`;
  }, [categories]);

  function openCreate() {
    setEditingProduct(null);
    setForm({ ...EMPTY_FORM, category_id: categories[0] ? String(categories[0].id) : "" });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(product: ProductAdmin) {
    setEditingProduct(product);
    setForm({
      sku: product.sku,
      name: product.name,
      category_id: String(product.category_id),
      description: product.description ?? "",
      cost_price: product.cost_price,
      base_price: product.base_price,
      stock: String(product.stock),
      is_new: product.is_new,
      is_active: product.is_active,
      image_urls: product.images.map((i) => i.url).join("\n"),
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const image_urls = form.image_urls
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      if (editingProduct) {
        const body: ProductUpdateInput = {
          sku: form.sku,
          name: form.name,
          category_id: Number(form.category_id),
          description: form.description || null,
          cost_price: form.cost_price,
          base_price: form.base_price,
          stock: Number(form.stock),
          is_new: form.is_new,
          is_active: form.is_active,
          image_urls,
        };
        await api.patch(`/admin/products/${editingProduct.id}`, body);
      } else {
        const body: ProductCreateInput = {
          sku: form.sku,
          name: form.name,
          category_id: Number(form.category_id),
          description: form.description || null,
          cost_price: form.cost_price,
          base_price: form.base_price,
          stock: Number(form.stock),
          is_new: form.is_new,
          image_urls,
        };
        await api.post("/admin/products", body);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Не удалось сохранить товар");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(product: ProductAdmin) {
    try {
      await api.patch(`/admin/products/${product.id}`, { is_active: !product.is_active });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось изменить статус товара");
    }
  }

  async function handleDelete(product: ProductAdmin) {
    if (!confirm(`Удалить товар «${product.name}»? Это необратимо.`)) return;
    try {
      await api.delete(`/admin/products/${product.id}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось удалить товар");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Товары</h1>
          <div className="page-header__sub">{products.length} товаров</div>
        </div>
        <button className="btn" onClick={openCreate}>
          + Новый товар
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Поиск по названию или артикулу"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Все категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : error ? (
          <div className="table-error">{error}</div>
        ) : products.length === 0 ? (
          <div className="table-empty">Товары не найдены</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Товар</th>
                <th>Артикул</th>
                <th>Категория</th>
                <th>Себестоимость</th>
                <th>Базовая цена</th>
                <th>Остаток</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name}
                    {p.is_new && <span className="badge badge--info" style={{ marginLeft: 8 }}>Новинка</span>}
                  </td>
                  <td>{p.sku}</td>
                  <td>{categoryName(p.category_id)}</td>
                  <td>{formatPrice(p.cost_price)}</td>
                  <td>{formatPrice(p.base_price)}</td>
                  <td>{p.stock <= 5 ? <span className="badge badge--warn">{p.stock} шт</span> : `${p.stock} шт`}</td>
                  <td>
                    <span className={`badge ${p.is_active ? "badge--ok" : "badge--muted"}`}>
                      {p.is_active ? "Активен" : "Скрыт"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--outline btn--sm" onClick={() => toggleActive(p)}>
                        {p.is_active ? "Скрыть" : "Показать"}
                      </button>
                      <button className="btn btn--outline btn--sm" onClick={() => setHistoryProduct(p)}>
                        История
                      </button>
                      <button className="btn btn--outline btn--sm" onClick={() => openEdit(p)}>
                        Изменить
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDelete(p)}>
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

      {modalOpen && (
        <Modal
          title={editingProduct ? "Изменить товар" : "Новый товар"}
          onClose={() => setModalOpen(false)}
          wide
        >
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label className="form-field">
                Артикул
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  required
                />
              </label>
              <label className="form-field">
                Категория
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Выберите категорию
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="form-field">
              Название
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>

            <label className="form-field">
              Описание
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <div className="form-row">
              <label className="form-field">
                Себестоимость, ₽
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                />
              </label>
              <label className="form-field">
                Базовая цена, ₽
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.base_price}
                  onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                  required
                />
              </label>
            </div>

            <label className="form-field">
              Остаток на складе
              <input
                type="number"
                min="0"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                required
              />
            </label>

            <label className="form-field">
              Фотографии — по одной ссылке на строку
              <textarea
                value={form.image_urls}
                onChange={(e) => setForm({ ...form, image_urls: e.target.value })}
                placeholder="https://example.com/photo1.jpg"
              />
            </label>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={form.is_new}
                onChange={(e) => setForm({ ...form, is_new: e.target.checked })}
              />
              Пометить как новинку
            </label>

            {editingProduct && (
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Товар активен (виден клиентам)
              </label>
            )}

            {formError && <p className="form-error">{formError}</p>}

            <div className="modal__footer">
              <button type="button" className="btn btn--outline" onClick={() => setModalOpen(false)}>
                Отмена
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {historyProduct && (
        <ProductHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}

function reasonLabel(reason: StockHistoryEntry["reason"]): string {
  return reason === "order" ? "Заказ" : "Ручная правка";
}

function ProductHistoryModal({
  product,
  onClose,
}: {
  product: ProductAdmin;
  onClose: () => void;
}) {
  const [sales, setSales] = useState<MonthlyPoint[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistoryEntry[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get<MonthlyPoint[]>(`/admin/analytics/products/${product.id}/sales?months=6`),
      api.get<StockHistoryEntry[]>(`/admin/products/${product.id}/stock-history?limit=30`),
      api.get<PriceHistoryEntry[]>(`/admin/products/${product.id}/price-history?limit=30`),
    ])
      .then(([s, sh, ph]) => {
        setSales(s);
        setStockHistory(sh);
        setPriceHistory(ph);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить историю"))
      .finally(() => setIsLoading(false));
  }, [product.id]);

  return (
    <Modal title={`История: ${product.name}`} onClose={onClose} wide>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : error ? (
        <div className="table-error">{error}</div>
      ) : (
        <>
          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Продажи по месяцам</h3>
          <div style={{ marginBottom: 24 }}>
            <BarChart
              data={sales.map((p) => ({ label: p.month.slice(2), value: p.quantity }))}
              formatValue={(v) => `${v} шт`}
              color="#2c5a8c"
            />
          </div>

          <div className="form-row">
            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>История цены</h3>
              <div className="table-wrap" style={{ maxHeight: 220, overflowY: "auto" }}>
                {priceHistory.length === 0 ? (
                  <div className="table-empty">Изменений пока не было</div>
                ) : (
                  <table className="data-table">
                    <tbody>
                      {priceHistory.map((h) => (
                        <tr key={h.id}>
                          <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                            {formatDateTime(h.created_at)}
                          </td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {h.old_price ? `${formatPrice(h.old_price)} → ` : "установлена: "}
                            <strong>{formatPrice(h.new_price)}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 14, marginBottom: 8 }}>История остатков</h3>
              <div className="table-wrap" style={{ maxHeight: 220, overflowY: "auto" }}>
                {stockHistory.length === 0 ? (
                  <div className="table-empty">Изменений пока не было</div>
                ) : (
                  <table className="data-table">
                    <tbody>
                      {stockHistory.map((h) => (
                        <tr key={h.id}>
                          <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                            {formatDateTime(h.created_at)}
                          </td>
                          <td style={{ color: h.change < 0 ? "var(--color-danger)" : "var(--color-primary)" }}>
                            {h.change > 0 ? "+" : ""}
                            {h.change}
                          </td>
                          <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                            {reasonLabel(h.reason)}
                            {h.order_id ? ` №${h.order_id}` : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
