import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { api, ApiError, resolveImageUrl, uploadImages } from "../api/client";
import type {
  Category,
  MonthlyPoint,
  PriceHistoryEntry,
  ProductAdmin,
  ProductBuyer,
  ProductCreateInput,
  ProductStats,
  ProductUpdateInput,
} from "../api/types";
import { ActionsMenu } from "../components/ActionsMenu";
import { BarChart } from "../components/BarChart";
import { Modal } from "../components/Modal";
import { formatDateTime, formatPrice } from "../utils/format";
import { generateSkuFromName } from "../utils/sku";

interface FormState {
  sku: string;
  name: string;
  category_id: string;
  description: string;
  base_price: string;
  is_new: boolean;
  is_active: boolean;
  // Первая ссылка — основное фото (то, что показывается на карточке в каталоге).
  image_urls: string[];
}

const EMPTY_FORM: FormState = {
  sku: "",
  name: "",
  category_id: "",
  description: "",
  base_price: "",
  is_new: false,
  is_active: true,
  image_urls: [],
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
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");

  const [statsProduct, setStatsProduct] = useState<ProductAdmin | null>(null);

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
    setUploadError(null);
    setNewPhotoUrl("");
    setModalOpen(true);
  }

  function openEdit(product: ProductAdmin) {
    setEditingProduct(product);
    setForm({
      sku: product.sku,
      name: product.name,
      category_id: String(product.category_id),
      description: product.description ?? "",
      base_price: product.base_price,
      is_new: product.is_new,
      is_active: product.is_active,
      image_urls: product.images.map((i) => i.url),
    });
    setFormError(null);
    setUploadError(null);
    setNewPhotoUrl("");
    setModalOpen(true);
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    setUploadError(null);
    try {
      const urls = await uploadImages(Array.from(files));
      setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, ...urls] }));
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Не удалось загрузить фото");
    } finally {
      setUploadingPhotos(false);
      e.target.value = ""; // чтобы можно было выбрать тот же файл повторно
    }
  }

  function handleAddPhotoUrl() {
    const trimmed = newPhotoUrl.trim();
    if (!trimmed) return;
    setForm((prev) => ({ ...prev, image_urls: [...prev.image_urls, trimmed] }));
    setNewPhotoUrl("");
  }

  function makePhotoPrimary(index: number) {
    setForm((prev) => {
      const urls = [...prev.image_urls];
      const [chosen] = urls.splice(index, 1);
      urls.unshift(chosen);
      return { ...prev, image_urls: urls };
    });
  }

  function removePhoto(index: number) {
    setForm((prev) => ({ ...prev, image_urls: prev.image_urls.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const image_urls = form.image_urls;

    try {
      if (editingProduct) {
        const body: ProductUpdateInput = {
          sku: form.sku,
          name: form.name,
          category_id: Number(form.category_id),
          description: form.description || null,
          base_price: form.base_price,
          is_new: form.is_new,
          is_active: form.is_active,
          image_urls,
        };
        await api.patch(`/admin/products/${editingProduct.id}`, body);
      } else {
        // Остаток и себестоимость сюда не входят — новый товар всегда заводится с остатком
        // 0, склад пополняется только через документ приёмки.
        const body: ProductCreateInput = {
          sku: form.sku,
          name: form.name,
          category_id: Number(form.category_id),
          description: form.description || null,
          base_price: form.base_price,
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
          <div className="page-header__sub">
            {products.length} товаров — здесь только описание и цена, остатки смотрите на Складе
          </div>
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
                <th>Базовая цена</th>
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
                  <td>{formatPrice(p.base_price)}</td>
                  <td>
                    <span className={`badge ${p.is_active ? "badge--ok" : "badge--muted"}`}>
                      {p.is_active ? "Активен" : "Скрыт"}
                    </span>
                  </td>
                  <td>
                    <ActionsMenu>
                      <button className="actions-menu__item" onClick={() => toggleActive(p)}>
                        {p.is_active ? "Скрыть" : "Показать"}
                      </button>
                      <button className="actions-menu__item" onClick={() => setStatsProduct(p)}>
                        Аналитика
                      </button>
                      <button className="actions-menu__item" onClick={() => openEdit(p)}>
                        Изменить
                      </button>
                      <button
                        className="actions-menu__item actions-menu__item--danger"
                        onClick={() => handleDelete(p)}
                      >
                        Удалить
                      </button>
                    </ActionsMenu>
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
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => setForm((f) => ({ ...f, sku: generateSkuFromName(f.name) }))}
                    title="Сгенерировать из названия"
                  >
                    Сгенерировать
                  </button>
                </div>
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

            {!editingProduct && (
              <p className="form-hint" style={{ marginTop: -8 }}>
                Товар создастся с остатком 0 — чтобы он появился на складе, оформите приёмку.
              </p>
            )}

            <div className="form-field">
              <span>Фотографии</span>

              <div className="product-photo-upload">
                <input
                  type="file"
                  id="product-photo-input"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploadingPhotos}
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <label htmlFor="product-photo-input" className="btn btn--outline btn--sm">
                  {uploadingPhotos ? "Загрузка..." : "Загрузить фото"}
                </label>
                <span className="form-hint" style={{ margin: 0 }}>
                  JPG, PNG или WEBP, до 5 МБ на файл — можно выбрать сразу несколько
                </span>
              </div>
              {uploadError && <p className="form-error">{uploadError}</p>}

              {form.image_urls.length > 0 && (
                <div className="product-photo-gallery">
                  {form.image_urls.map((url, i) => (
                    <div key={`${url}-${i}`} className="product-photo-gallery__item">
                      <img src={resolveImageUrl(url)} alt="" />
                      {i === 0 && (
                        <span className="product-photo-gallery__badge">Основное</span>
                      )}
                      <div className="product-photo-gallery__actions">
                        {i !== 0 && (
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => makePhotoPrimary(i)}
                          >
                            Сделать основным
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => removePhoto(i)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="product-photo-add-url">
                <input
                  type="text"
                  placeholder="Или вставьте ссылку на фото"
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPhotoUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={handleAddPhotoUrl}
                >
                  Добавить
                </button>
              </div>
            </div>

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

      {statsProduct && (
        <ProductAnalyticsModal product={statsProduct} onClose={() => setStatsProduct(null)} />
      )}
    </div>
  );
}

function ProductAnalyticsModal({ product, onClose }: { product: ProductAdmin; onClose: () => void }) {
  const [sales, setSales] = useState<MonthlyPoint[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [buyers, setBuyers] = useState<ProductBuyer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get<MonthlyPoint[]>(`/admin/analytics/products/${product.id}/sales?months=6`),
      api.get<PriceHistoryEntry[]>(`/admin/products/${product.id}/price-history?limit=30`),
      api.get<ProductStats>(`/admin/analytics/products/${product.id}/stats`),
      api.get<ProductBuyer[]>(`/admin/analytics/products/${product.id}/buyers?limit=10`),
    ])
      .then(([s, ph, st, b]) => {
        setSales(s);
        setPriceHistory(ph);
        setStats(st);
        setBuyers(b);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить аналитику"))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  const costPrice = Number(product.cost_price);
  const profitPerUnit = Number(product.base_price) - costPrice;
  const markupPercent = costPrice > 0 ? (profitPerUnit / costPrice) * 100 : null;

  return (
    <Modal title={`Аналитика: ${product.name}`} onClose={onClose} wide>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : error ? (
        <div className="table-error">{error}</div>
      ) : (
        <>
          <p className="form-hint" style={{ marginTop: 0, marginBottom: 16 }}>
            Товар создан: {formatDateTime(product.created_at)}
          </p>

          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-card__label">Прибыль с единицы</div>
              <div className="stat-card__value">{formatPrice(profitPerUnit)}</div>
              <div className="stat-card__sub">Цена продажи − текущая себестоимость</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__label">Наценка</div>
              <div className="stat-card__value">
                {markupPercent === null ? "—" : `${markupPercent.toFixed(1)}%`}
              </div>
              <div className="stat-card__sub">Прибыль / себестоимость</div>
            </div>
          </div>

          {stats && (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="stat-card">
                <div className="stat-card__label">Продано за 30 дней</div>
                <div className="stat-card__value">{stats.sold_30d} шт</div>
                <div className="stat-card__sub">
                  7д: {stats.sold_7d} шт · 90д: {stats.sold_90d} шт
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Выручка за 30 дней</div>
                <div className="stat-card__value">{formatPrice(stats.revenue_30d)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Прибыль за 30 дней</div>
                <div className="stat-card__value">{formatPrice(stats.profit_30d)}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Рентабельность (30 дней)</div>
                <div className="stat-card__value">{Number(stats.margin_percent_30d).toFixed(1)}%</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Среднее кол-во в заказе</div>
                <div className="stat-card__value">
                  {Number(stats.avg_quantity_per_order).toFixed(1)} шт
                </div>
              </div>
            </div>
          )}

          <h3 style={{ fontSize: 14, marginBottom: 4 }}>Продажи по месяцам</h3>
          <div style={{ marginBottom: 24 }}>
            <BarChart
              data={sales.map((p) => ({ label: p.month.slice(2), value: Number(p.revenue) }))}
              formatValue={(v) => formatPrice(v)}
              color="#2c5a8c"
            />
          </div>

          <h3 style={{ fontSize: 14, marginBottom: 8 }}>История цены</h3>
          <div className="table-wrap" style={{ maxHeight: 220, overflowY: "auto", marginBottom: 24 }}>
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

          <h3 style={{ fontSize: 14, marginBottom: 8 }}>Кто покупал</h3>
          <div className="table-wrap" style={{ maxHeight: 220, overflowY: "auto" }}>
            {buyers.length === 0 ? (
              <div className="table-empty">Пока никто не покупал</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {buyers.map((b) => (
                    <tr key={b.user_id}>
                      <td>{b.company_name || b.login}</td>
                      <td style={{ color: "var(--color-text-muted)" }}>{b.quantity} шт</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>{formatPrice(b.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
