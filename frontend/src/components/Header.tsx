import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "./Header.css";

interface HeaderProps {
  onCartClick: () => void;
}

export function Header({ onCartClick }: HeaderProps) {
  const { signOut } = useAuth();
  const { totalCount } = useCart();

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
          <a href="#">Каталог</a>
          <a href="#">Мои заказы</a>
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
            Корзина
            {totalCount > 0 && <span className="header__cart-badge">{totalCount}</span>}
          </button>
        </div>
      </div>
    </header>
  );
}
