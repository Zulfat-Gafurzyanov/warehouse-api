import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./Header.css";

interface HeaderProps {
  onCartClick: () => void;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : "");

export function Header({ onCartClick }: HeaderProps) {
  const { signOut } = useAuth();
  const { totalCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="header">
      <div className="container header__inner">
        <div className="header__logo">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M3 8.5V16l9 4.5 9-4.5V8.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M12 13v7.5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span>
            warehouse<strong>.</strong>
          </span>
        </div>

        <nav className="header__nav">
          <NavLink to="/catalog" className={navLinkClass}>
            Каталог
          </NavLink>
          <NavLink to="/orders" className={navLinkClass}>
            Мои заказы
          </NavLink>
          <NavLink to="/favorites" className={navLinkClass}>
            Избранное
          </NavLink>
        </nav>

        <div className="header__actions">
          <button className="btn btn--outline header__logout" onClick={signOut}>
            Выйти
          </button>
          <button className="header__cart" onClick={onCartClick}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="21" r="1.4" fill="currentColor" />
              <circle cx="17" cy="21" r="1.4" fill="currentColor" />
            </svg>
            <span className="header__cart-label">Корзина</span>
            {totalCount > 0 && <span className="header__cart-badge">{totalCount}</span>}
          </button>

          <button
            className="header__burger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6 6l12 12M18 6 6 18"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="header__mobile-menu">
          <NavLink to="/catalog" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Каталог
          </NavLink>
          <NavLink to="/orders" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Мои заказы
          </NavLink>
          <NavLink to="/favorites" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            Избранное
          </NavLink>
          <button
            className="header__mobile-logout"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            Выйти
          </button>
        </nav>
      )}
    </header>
  );
}
