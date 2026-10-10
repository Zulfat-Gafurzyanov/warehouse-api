import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { api, ApiError, resolveImageUrl, uploadImages } from "../api/client";
import type { CostPriceItem, CostPriceItemInput } from "../api/types";
import { Modal } from "../components/Modal";
import { formatPrice } from "../utils/format";

interface FormState {
  name: string;
  photo_url: string | null;
  unit_price: string;
  quantity: string;
  china_delivery_price: string;
  russia_delivery_price: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  photo_url: null,
  unit_price: "",
  quantity: "",
  china_delivery_price: "",
  russia_delivery_price: "",
};

export function CostPriceItemsPage() {
  const [items, setItems] = useState<CostPriceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<CostPriceItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function load() {
    setIsLoading(true);
    api
      .get<CostPriceItem[]>("/admin/cost-price-items")
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить записи"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setUploadError(null);
    setModalOpen(true);
  }

  function openEdit(item: CostPriceItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      photo_url: item.photo_url,
      unit_price: item.unit_price,
      quantity: String(item.quantity),
      china_delivery_price: item.china_delivery_price,
      russia_delivery_price: item.russia_delivery_price,
    });
    setFormError(null);
    setUploadError(null);
    setModalOpen(true);
  }

  async function handlePhotoUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    setUploadError(null);
    try {
      const [url] = await uploadImages([files[0]]);
      setForm((prev) => ({ ...prev, photo_url: url }));
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Не удалось загрузить фото");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const body: CostPriceItemInput = {
      name: form.name,
      photo_url: form.photo_url,
      unit_price: form.unit_price || "0",
      quantity: Number(form.quantity || 0),
      china_delivery_price: form.china_delivery_price || "0",
      russia_delivery_price: form.russia_delivery_price || "0",
    };

    try {
      if (editingItem) {
        await api.patch(`/admin/cost-price-items/${editingItem.id}`, body);
      } else {
        await api.post("/admin/cost-price-items", body);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Не удалось сохранить запись");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item: CostPriceItem) {
    if (!confirm(`Удалить запись «${item.name}»?`)) return;
    try {
      await api.delete(`/admin/cost-price-items/${item.id}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось удалить запись");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Себестоимость товара</h1>
          <div className="page-header__sub">
            Рабочий блокнот для партий из Китая — не связан с «Товары» и «Склад»
          </div>
        </div>
        <button className="btn" onClick={openCreate}>
          + Новая запись
        </button>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : error ? (
          <div className="table-error">{error}</div>
        ) : items.length === 0 ? (
          <div className="table-empty">Записей пока нет</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Название</th>
                <th>Цена за шт.</th>
                <th>Кол-во</th>
                <th>Доставка по Китаю/шт.</th>
                <th>Доставка в Россию/шт.</th>
                <th>Себестоимость/шт.</th>
                <th>Себестоимость партии</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.photo_url ? (
                      <img
                        src={resolveImageUrl(item.photo_url)}
                        alt=""
                        className="receipt-line-thumb"
                      />
                    ) : (
                      <div className="receipt-line-thumb receipt-line-thumb--empty" />
                    )}
                  </td>
                  <td>{item.name}</td>
                  <td>{formatPrice(item.unit_price)}</td>
                  <td>{item.quantity} шт</td>
                  <td>{formatPrice(item.china_delivery_price)}</td>
                  <td>{formatPrice(item.russia_delivery_price)}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(item.total_cost_per_unit)}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(item.total_cost_batch)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--outline btn--sm" onClick={() => openEdit(item)}>
                        Изменить
                      </button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleDelete(item)}
                      >
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
          title={editingItem ? "Изменить запись" : "Новая запись"}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            <label className="form-field">
              Название
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </label>

            <div className="form-field">
              <span>Фото</span>
              <div className="product-photo-upload">
                <input
                  type="file"
                  id="cost-price-photo-input"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingPhoto}
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <label htmlFor="cost-price-photo-input" className="btn btn--outline btn--sm">
                  {uploadingPhoto ? "Загрузка..." : form.photo_url ? "Заменить фото" : "Загрузить фото"}
                </label>
              </div>
              {uploadError && <p className="form-error">{uploadError}</p>}
              {form.photo_url && (
                <img
                  src={resolveImageUrl(form.photo_url)}
                  alt=""
                  style={{ width: 96, height: 96, objectFit: "cover", borderRadius: "var(--radius-sm)", marginTop: 8 }}
                />
              )}
            </div>

            <div className="form-row">
              <label className="form-field">
                Цена за штуку, ₽
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                  required
                />
              </label>
              <label className="form-field">
                Количество, шт
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </label>
            </div>

            <div className="form-row">
              <label className="form-field">
                Доставка по Китаю за штуку, ₽
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.china_delivery_price}
                  onChange={(e) => setForm({ ...form, china_delivery_price: e.target.value })}
                  required
                />
              </label>
              <label className="form-field">
                Доставка в Россию за штуку, ₽
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.russia_delivery_price}
                  onChange={(e) => setForm({ ...form, russia_delivery_price: e.target.value })}
                  required
                />
              </label>
            </div>

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
    </div>
  );
}
