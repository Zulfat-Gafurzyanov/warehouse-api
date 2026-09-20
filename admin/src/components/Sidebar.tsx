import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Sidebar.css";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `sidebar-nav__link ${isActive ? "sidebar-nav__link--active" : ""}`;

const ITEMS = [
  { to: "/", label: "Дашборд", exact: true },
  { to: "/orders", label: "Заказы" },
  { to: "/products", label: "Товары" },
  { to: "/categories", label: "Категории" },
  { to: "/clients", label: "Клиенты" },
  { to: "/price-groups", label: "Ценовые группы" },
];

export function Sidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        warehouse<strong>.</strong>
        <span>CRM</span>
      </div>

      <nav className="sidebar-nav">
        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.exact} className={navLinkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <button className="sidebar__logout" onClick={signOut}>
        Выйти
      </button>
    </aside>
  );
}
