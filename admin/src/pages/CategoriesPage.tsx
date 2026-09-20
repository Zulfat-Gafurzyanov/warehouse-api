import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { Category } from "../api/types";
import { Modal } from "../components/Modal";
import { formatDate } from "../utils/format";

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    api
      .get<Category[]>("/categories")
      .then(setCategories)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить категории"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingCategory(null);
    setName("");
    setFormError(null);
    setModalMode("create");
  }

  function openEdit(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setFormError(null);
    setModalMode("edit");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      if (modalMode === "edit" && editingCategory) {
        await api.patch(`/admin/categories/${editingCategory.id}`, { name });
      } else {
        await api.post("/admin/categories", { name });
      }
      setModalMode(null);
      load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : "Не удалось сохранить категорию");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(category: Category) {
    if (!confirm(`Удалить категорию «${category.name}»?`)) return;
    try {
      await api.delete(`/admin/categories/${category.id}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось удалить категорию");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Категории</h1>
          <div className="page-header__sub">Категории товаров для каталога</div>
        </div>
        <button className="btn" onClick={openCreate}>
          + Новая категория
        </button>
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : error ? (
          <div className="table-error">{error}</div>
        ) : categories.length === 0 ? (
          <div className="table-empty">Категорий пока нет</div>
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
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{formatDate(c.created_at)}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn--outline btn--sm" onClick={() => openEdit(c)}>
                        Изменить
                      </button>
                      <button
                        className="btn btn--danger btn--sm"
                        onClick={() => handleDelete(c)}
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

      {modalMode && (
        <Modal
          title={modalMode === "edit" ? "Изменить категорию" : "Новая категория"}
          onClose={() => setModalMode(null)}
        >
          <form onSubmit={handleSubmit}>
            <label className="form-field">
              Название
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>

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
    </div>
  );
}
