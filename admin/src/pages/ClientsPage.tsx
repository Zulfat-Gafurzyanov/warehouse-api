import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import {
  COOPERATION_LABELS,
  type ClientCreateInput,
  type ClientProfileUpdateInput,
  type CooperationType,
  type PriceGroup,
  type ProductAdmin,
  type UserPrice,
  type UserProfile,
} from "../api/types";
import { Modal } from "../components/Modal";
import { formatPrice } from "../utils/format";

interface ProfileFormState {
  company_name: string;
  contact_name: string;
  cooperation_type: CooperationType | "";
  price_group_id: string;
}

interface CreateFormState extends ProfileFormState {
  email: string;
  password: string;
}

const EMPTY_CREATE: CreateFormState = {
  email: "",
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

  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState>({
    company_name: "",
    contact_name: "",
    cooperation_type: "",
    price_group_id: "",
  });
  const [profileError, setProfileError] = useState<string | null>(null);

  const [pricesUser, setPricesUser] = useState<UserProfile | null>(null);

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
      u.email.toLowerCase().includes(q) ||
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
        email: createForm.email,
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

  function openEditProfile(user: UserProfile) {
    setEditingUser(user);
    setProfileForm({
      company_name: user.company_name ?? "",
      contact_name: user.contact_name ?? "",
      cooperation_type: user.cooperation_type ?? "",
      price_group_id: user.price_group_id ? String(user.price_group_id) : "",
    });
    setProfileError(null);
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setSubmitting(true);
    setProfileError(null);
    try {
      const body: ClientProfileUpdateInput = {
        company_name: profileForm.company_name || null,
        contact_name: profileForm.contact_name || null,
        cooperation_type: profileForm.cooperation_type || null,
        price_group_id: profileForm.price_group_id ? Number(profileForm.price_group_id) : null,
      };
      await api.patch(`/admin/users/${editingUser.id}/profile`, body);
      setEditingUser(null);
      load();
    } catch (e) {
      setProfileError(e instanceof ApiError ? e.message : "Не удалось сохранить профиль");
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
          placeholder="Поиск по email, компании или контакту"
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
                <th>Email</th>
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
                  <td>{u.email}</td>
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
                      <button className="btn btn--outline btn--sm" onClick={() => setPricesUser(u)}>
                        Цены
                      </button>
                      <button className="btn btn--outline btn--sm" onClick={() => openEditProfile(u)}>
                        Изменить
                      </button>
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
                Email
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
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

            <ProfileFields
              value={createForm}
              onChange={(patch) => setCreateForm({ ...createForm, ...patch })}
              priceGroups={priceGroups}
            />

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

      {editingUser && (
        <Modal title={`Профиль: ${editingUser.email}`} onClose={() => setEditingUser(null)}>
          <form onSubmit={handleProfileSubmit}>
            <ProfileFields
              value={profileForm}
              onChange={(patch) => setProfileForm({ ...profileForm, ...patch })}
              priceGroups={priceGroups}
            />

            {profileError && <p className="form-error">{profileError}</p>}

            <div className="modal__footer">
              <button type="button" className="btn btn--outline" onClick={() => setEditingUser(null)}>
                Отмена
              </button>
              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pricesUser && (
        <ClientPricesModal user={pricesUser} onClose={() => setPricesUser(null)} />
      )}
    </div>
  );
}

function ProfileFields({
  value,
  onChange,
  priceGroups,
}: {
  value: ProfileFormState;
  onChange: (patch: Partial<ProfileFormState>) => void;
  priceGroups: PriceGroup[];
}) {
  return (
    <>
      <div className="form-row">
        <label className="form-field">
          Компания
          <input
            value={value.company_name}
            onChange={(e) => onChange({ company_name: e.target.value })}
          />
        </label>
        <label className="form-field">
          Контактное лицо
          <input
            value={value.contact_name}
            onChange={(e) => onChange({ contact_name: e.target.value })}
          />
        </label>
      </div>

      <div className="form-row">
        <label className="form-field">
          Тип сотрудничества
          <select
            value={value.cooperation_type}
            onChange={(e) => onChange({ cooperation_type: e.target.value as CooperationType | "" })}
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
            value={value.price_group_id}
            onChange={(e) => onChange({ price_group_id: e.target.value })}
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
    </>
  );
}

function ClientPricesModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const [prices, setPrices] = useState<UserPrice[]>([]);
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
      api.get<UserPrice[]>(`/admin/users/${user.id}/prices`),
      api.get<ProductAdmin[]>("/admin/products?limit=200"),
    ])
      .then(([p, prod]) => {
        setPrices(p);
        setProducts(prod);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить цены"))
      .finally(() => setIsLoading(false));
  }

  useEffect(load, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!productId || !price) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.put(`/admin/users/${user.id}/prices/${productId}`, { price });
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
      await api.delete(`/admin/users/${user.id}/prices/${pid}`);
      load();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Не удалось удалить цену");
    }
  }

  const availableProducts = products.filter((p) => !prices.some((pr) => pr.product_id === p.id));

  return (
    <Modal title={`Индивидуальные цены: ${user.company_name || user.email}`} onClose={onClose} wide>
      {isLoading ? (
        <div className="table-loading">Загрузка...</div>
      ) : error ? (
        <div className="table-error">{error}</div>
      ) : (
        <>
          {prices.length === 0 ? (
            <p className="form-hint" style={{ marginTop: 0 }}>
              Индивидуальных цен пока нет — клиент видит базовую или групповую цену.
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
