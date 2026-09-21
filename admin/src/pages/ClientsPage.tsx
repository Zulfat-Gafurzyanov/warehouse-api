import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import {
  COOPERATION_LABELS,
  type ClientCreateInput,
  type CooperationType,
  type PriceGroup,
  type UserProfile,
} from "../api/types";
import { Modal } from "../components/Modal";

interface CreateFormState {
  login: string;
  password: string;
  company_name: string;
  contact_name: string;
  cooperation_type: CooperationType | "";
  price_group_id: string;
}

const EMPTY_CREATE: CreateFormState = {
  login: "",
  password: "",
  company_name: "",
  contact_name: "",
  cooperation_type: "",
  price_group_id: "",
};

export function ClientsPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [priceGroups, setPriceGroups] = useState<PriceGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE);
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setIsLoading(true);
    api
      .get<UserProfile[]>("/admin/users?limit=200")
      .then(setUsers)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить клиентов"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, []);
  useEffect(() => {
    api.get<PriceGroup[]>("/admin/price-groups").then(setPriceGroups).catch(() => {});
  }, []);

  const priceGroupName = useMemo(() => {
    const map = new Map(priceGroups.map((g) => [g.id, g.name]));
    return (id: number | null) => (id ? (map.get(id) ?? `#${id}`) : "—");
  }, [priceGroups]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      u.login.toLowerCase().includes(q) ||
      (u.company_name ?? "").toLowerCase().includes(q) ||
      (u.contact_name ?? "").toLowerCase().includes(q)
    );
  });

  function openCreate() {
    setCreateForm(EMPTY_CREATE);
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCreateError(null);
    try {
      const body: ClientCreateInput = {
        login: createForm.login,
        password: createForm.password,
        company_name: createForm.company_name || null,
        contact_name: createForm.contact_name || null,
        cooperation_type: createForm.cooperation_type || null,
        price_group_id: createForm.price_group_id ? Number(createForm.price_group_id) : null,
      };
      await api.post("/admin/users", body);
      setCreateOpen(false);
      load();
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Не удалось создать клиента");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: UserProfile) {
    try {
      await api.patch(`/admin/users/${user.id}/active`, { is_active: !user.is_active });
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось изменить статус клиента");
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Клиенты</h1>
          <div className="page-header__sub">{users.length} аккаунтов</div>
        </div>
        <button className="btn" onClick={openCreate}>
          + Новый клиент
        </button>
      </div>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Поиск по логину, компании или контакту"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        {isLoading ? (
          <div className="table-loading">Загрузка...</div>
        ) : error ? (
          <div className="table-error">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">Клиенты не найдены</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Логин</th>
                <th>Компания</th>
                <th>Контакт</th>
                <th>Сотрудничество</th>
                <th>Ценовая группа</th>
                <th>Роль</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link to={`/clients/${u.id}`} style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                      {u.login}
                    </Link>
                  </td>
                  <td>{u.company_name || "—"}</td>
                  <td>{u.contact_name || "—"}</td>
                  <td>{u.cooperation_type ? COOPERATION_LABELS[u.cooperation_type] : "—"}</td>
                  <td>{priceGroupName(u.price_group_id)}</td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge--info" : "badge--muted"}`}>
                      {u.role === "admin" ? "Админ" : "Клиент"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? "badge--ok" : "badge--danger"}`}>
                      {u.is_active ? "Активен" : "Заблокирован"}
                    </span>
                  </td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/clients/${u.id}`} className="btn btn--outline btn--sm">
                        Карточка
                      </Link>
                      <button
                        className={`btn btn--sm ${u.is_active ? "btn--danger" : ""}`}
                        onClick={() => toggleActive(u)}
                      >
                        {u.is_active ? "Заблокировать" : "Разблокировать"}
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
        <Modal title="Новый клиент" onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate}>
            <div className="form-row">
              <label className="form-field">
                Логин
                <input
                  value={createForm.login}
                  onChange={(e) => setCreateForm({ ...createForm, login: e.target.value })}
                  required
                  minLength={3}
                  autoFocus
                />
              </label>
              <label className="form-field">
                Пароль
                <input
                  type="text"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={8}
                />
              </label>
            </div>

            <div className="form-row">
              <label className="form-field">
                Компания
                <input
                  value={createForm.company_name}
                  onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
                />
              </label>
              <label className="form-field">
                Контактное лицо
                <input
                  value={createForm.contact_name}
                  onChange={(e) => setCreateForm({ ...createForm, contact_name: e.target.value })}
                />
              </label>
            </div>

            <div className="form-row">
              <label className="form-field">
                Тип сотрудничества
                <select
                  value={createForm.cooperation_type}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, cooperation_type: e.target.value as CooperationType | "" })
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
                  value={createForm.price_group_id}
                  onChange={(e) => setCreateForm({ ...createForm, price_group_id: e.target.value })}
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

            {createError && <p className="form-error">{createError}</p>}

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
    </div>
  );
}
