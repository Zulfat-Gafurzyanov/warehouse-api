import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { api, ApiError } from "../api/client";
import type { ProductAdmin, ReceiptListItem, ReceiptOut } from "../api/types";
import { Modal } from "../components/Modal";
import { formatDateTime, formatPrice } from "../utils/format";

interface DraftLine {
  productId: number;
  sku: string;
  name: string;
  imageUrl: string | null;
  quantity: string;
  unitCost: string;
}

const DROPDOWN_CLOSE_DELAY_MS = 150;

export function ReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [products, setProducts] = useState<ProductAdmin[]>([]);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [comment, setComment] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [detailReceipt, setDetailReceipt] = useState<ReceiptOut | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    api
      .get<ReceiptListItem[]>("/admin/receipts?limit=100")
      .then(setReceipts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить приёмки"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setLines([]);
    setComment("");
    setSearch("");
    setFormError(null);
    setModalOpen(true);
    if (products.length === 0) {
      api
        .get<ProductAdmin[]>("/admin/products?limit=200")
        .then(setProducts)
        .catch(() => {
          /* список товаров не критичен для открытия модалки — просто автокомплит будет пуст */
        });
    }
  }

  const availableProducts = products.filter((p) => !lines.some((l) => l.productId === p.id));
  const searchResults = !dropdownOpen
    ? []
    : search.trim().length === 0
      ? availableProducts.slice(0, 20)
      : availableProducts
          .filter(
            (p) =>
              p.name.toLowerCase().includes(search.trim().toLowerCase()) ||
              p.sku.toLowerCase().includes(search.trim().toLowerCase()),
          )
          .slice(0, 20);

  function addLine(product: ProductAdmin) {
    setLines((prev) => [
      ...prev,
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        imageUrl: product.images[0]?.url ?? null,
        quantity: "1",
        unitCost: product.cost_price,
      },
    ]);
    setSearch("");
  }

  function handleSearchKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (searchResults.length > 0) addLine(searchResults[0]);
  }

  function updateLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0) {
      setFormError("Добавьте хотя бы одну позицию");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post("/admin/receipts", {
        comment: comment.trim() || null,
        items: lines.map((l) => ({
          product_id: l.productId,
          quantity: Number(l.quantity),
          unit_cost: l.unitCost,
        })),
      });
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Не удалось оформить приёмку");
    } finally {
      setSubmitting(false);
    }
  }

  async function openDetail(id: number) {
    setDetailLoading(true);
    try {
      const receipt = await api.get<ReceiptOut>(`/admin/receipts/${id}`);
      setDetailReceipt(receipt);
    } catch {
      /* если не загрузилось — модалка просто не откроется, ошибку отдельно не показываем */
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailReceipt(null);
    setDetailLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Приёмка товара</h1>
          <div className="page-header__sub">{receipts.length} документов</div>
        </div>
        <button className="btn" onClick={openCreate}>
          + Новая приёмка
        </button>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : error ? (
          <div className="table-error">{error}</div>
        ) : receipts.length === 0 ? (
          <div className="table-empty">Приёмок пока не было</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>№</th>
                <th>Дата</th>
                <th>Комментарий</th>
                <th>Позиций</th>
                <th>Кол-во</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r) => (
                <tr key={r.id} onClick={() => openDetail(r.id)} style={{ cursor: "pointer" }}>
                  <td>№{r.id}</td>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td>{r.comment || "—"}</td>
                  <td>{r.item_count}</td>
                  <td>{r.total_quantity} шт</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatPrice(r.total_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <Modal title="Новая приёмка" onClose={() => setModalOpen(false)} wide>
          <form onSubmit={handleSubmit}>
            <label className="form-field" style={{ position: "relative" }}>
              Добавить товар
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), DROPDOWN_CLOSE_DELAY_MS)}
                placeholder="Начните вводить название или артикул — либо откройте список"
                autoComplete="off"
              />
              {searchResults.length > 0 && (
                <div className="receipt-autocomplete">
                  {searchResults.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      className="receipt-autocomplete__item"
                      onClick={() => addLine(p)}
                    >
                      {p.name} <span>({p.sku})</span>
                    </button>
                  ))}
                </div>
              )}
            </label>

            {lines.length > 0 && (
              <table className="data-table" style={{ marginBottom: 16 }}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Товар</th>
                    <th>Количество</th>
                    <th>Цена закупки, ₽</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={line.productId}>
                      <td>
                        {line.imageUrl ? (
                          <img
                            src={line.imageUrl}
                            alt=""
                            className="receipt-line-thumb"
                            onClick={() => setZoomedImage(line.imageUrl)}
                          />
                        ) : (
                          <div className="receipt-line-thumb receipt-line-thumb--empty" />
                        )}
                      </td>
                      <td>
                        {line.name}{" "}
                        <span style={{ color: "var(--color-text-muted)" }}>({line.sku})</span>
                      </td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(i, { quantity: e.target.value })}
                          style={{ width: 80 }}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitCost}
                          onChange={(e) => updateLine(i, { unitCost: e.target.value })}
                          style={{ width: 100 }}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => removeLine(i)}
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <label className="form-field">
              Комментарий (необязательно)
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: накладная от поставщика №55"
              />
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="modal__footer">
              <button type="button" className="btn btn--outline" onClick={() => setModalOpen(false)}>
                Отмена
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Сохранение..." : "Оформить приёмку"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {zoomedImage && (
        <Modal title="Фото товара" onClose={() => setZoomedImage(null)}>
          <img src={zoomedImage} alt="" style={{ width: "100%", borderRadius: "var(--radius-md)" }} />
        </Modal>
      )}

      {(detailReceipt || detailLoading) && (
        <Modal title={detailReceipt ? `Приёмка №${detailReceipt.id}` : "Загрузка..."} onClose={closeDetail}>
          {detailReceipt && (
            <>
              <p className="form-hint" style={{ marginTop: 0 }}>
                {formatDateTime(detailReceipt.created_at)}
                {detailReceipt.comment ? ` — ${detailReceipt.comment}` : ""}
              </p>
              <table className="data-table">
                <tbody>
                  {detailReceipt.items.map((item) => (
                    <tr key={item.product_id}>
                      <td>
                        {item.product_name}{" "}
                        <span style={{ color: "var(--color-text-muted)" }}>({item.product_sku})</span>
                      </td>
                      <td>{item.quantity} шт</td>
                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                        {formatPrice(item.unit_cost)}/шт
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
