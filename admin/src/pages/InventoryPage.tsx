import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError, resolveImageUrl } from "../api/client";
import type { Category, ProductAdmin, ProductStats, StockHistoryEntry } from "../api/types";
import { Modal } from "../components/Modal";
import { formatDateTime, formatPrice } from "../utils/format";

function reasonLabel(reason: StockHistoryEntry["reason"]): string {
  if (reason === "order") return "Заказ";
  if (reason === "receipt") return "Приёмка";
  return "Ручная правка";
}

export function InventoryPage() {
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  const [stockProduct, setStockProduct] = useState<ProductAdmin | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    const params = new URLSearchParams({ limit: "200" });
    if (categoryFilter) params.set("category_id", categoryFilter);
    if (search.trim()) params.set("search", search.trim());

    api
      .get<ProductAdmin[]>(`/admin/products?${params.toString()}`)
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить остатки"))
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Склад</h1>
          <div className="page-header__sub">
            {products.length} товаров — остатки пополняются только через «Приёмку»
          </div>
        </div>
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
                <th></th>
                <th>Товар</th>
                <th>Артикул</th>
                <th>Категория</th>
                <th>Себестоимость</th>
                <th>Остаток</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} onClick={() => setStockProduct(p)} style={{ cursor: "pointer" }}>
                  <td>
                    {p.images[0]?.url ? (
                      <img
                        src={resolveImageUrl(p.images[0].url)}
                        alt=""
                        className="receipt-line-thumb"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomedImage(p.images[0].url);
                        }}
                      />
                    ) : (
                      <div className="receipt-line-thumb receipt-line-thumb--empty" />
                    )}
                  </td>
                  <td>
                    {p.name}
                    {!p.is_active && <span className="badge badge--muted" style={{ marginLeft: 8 }}>Скрыт</span>}
                  </td>
                  <td>{p.sku}</td>
                  <td>{categoryName(p.category_id)}</td>
                  <td>{formatPrice(p.cost_price)}</td>
                  <td>{p.stock <= 5 ? <span className="badge badge--warn">{p.stock} шт</span> : `${p.stock} шт`}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn btn--outline btn--sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setStockProduct(p);
                      }}
                    >
                      История и корректировка
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {stockProduct && (
        <StockModal
          product={stockProduct}
          onClose={() => setStockProduct(null)}
          onChanged={(updated) => {
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setStockProduct(updated);
          }}
        />
      )}

      {zoomedImage && (
        <Modal title="Фото товара" onClose={() => setZoomedImage(null)}>
          <img src={resolveImageUrl(zoomedImage)} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
        </Modal>
      )}
    </div>
  );
}

function StockModal({
  product,
  onClose,
  onChanged,
}: {
  product: ProductAdmin;
  onClose: () => void;
  onChanged: (updated: ProductAdmin) => void;
}) {
  const [history, setHistory] = useState<StockHistoryEntry[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newStock, setNewStock] = useState(String(product.stock));
  const [correcting, setCorrecting] = useState(false);
  const [correctError, setCorrectError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    Promise.all([
      api.get<StockHistoryEntry[]>(`/admin/products/${product.id}/stock-history?limit=30`),
      api.get<ProductStats>(`/admin/analytics/products/${product.id}/stats`),
    ])
      .then(([h, st]) => {
        setHistory(h);
        setStats(st);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить историю"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCorrect(e: FormEvent) {
    e.preventDefault();
    const value = Number(newStock);
    if (!Number.isFinite(value) || value < 0) {
      setCorrectError("Укажите остаток — целое число не меньше 0");
      return;
    }
    if (value === product.stock) return;
    setCorrecting(true);
    setCorrectError(null);
    try {
      const updated = await api.patch<ProductAdmin>(`/admin/products/${product.id}`, { stock: value });
      onChanged(updated);
      load();
    } catch (e) {
      setCorrectError(e instanceof ApiError ? e.message : "Не удалось скорректировать остаток");
    } finally {
      setCorrecting(false);
    }
  }

  return (
    <Modal title={`Остаток: ${product.name}`} onClose={onClose} wide>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : error ? (
        <div className="table-error">{error}</div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-card__label">Сейчас на складе</div>
              <div className="stat-card__value">{product.stock} шт</div>
              <div className="stat-card__sub">Себестоимость: {formatPrice(product.cost_price)}/шт</div>
            </div>
            {stats && (
              <div className="stat-card">
                <div className="stat-card__label">Продано за 30 дней</div>
                <div className="stat-card__value">{stats.sold_30d} шт</div>
                <div className="stat-card__sub">
                  7д: {stats.sold_7d} шт · 90д: {stats.sold_90d} шт
                </div>
              </div>
            )}
          </div>

          <h3 style={{ fontSize: 14, marginBottom: 8 }}>История движений</h3>
          <div className="table-wrap" style={{ maxHeight: 260, overflowY: "auto", marginBottom: 20 }}>
            {history.length === 0 ? (
              <div className="table-empty">Изменений пока не было</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {history.map((h) => (
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
                        {h.unit_cost ? ` по ${formatPrice(h.unit_cost)}/шт` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 4 }}>Скорректировать остаток</h3>
            <p className="form-hint" style={{ marginTop: 0, marginBottom: 12 }}>
              Для пересчёта, списания брака или инвентаризации — не для приёмки товара
              (для этого есть отдельная страница «Приёмка»).
            </p>
            <form onSubmit={handleCorrect} className="form-row" style={{ alignItems: "flex-end" }}>
              <label className="form-field">
                Новый остаток, шт
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
              </label>
              <button type="submit" className="btn" disabled={correcting} style={{ marginBottom: 16 }}>
                {correcting ? "Сохранение..." : "Сохранить"}
              </button>
            </form>
            {correctError && <p className="form-error">{correctError}</p>}
          </div>
        </>
      )}
    </Modal>
  );
}
