import { useState } from "react";
import { api, ApiError } from "../api/client";
import type { OrderOut } from "../api/types";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { formatPrice } from "../utils/format";
import "./CartDrawer.css";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalAmount, removeItem, setQuantity, clear } = useCart();
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.post<OrderOut>("/orders", {
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      });
      clear();
      onClose();
      show(`Заказ №${order.id} успешно отправлен`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось оформить заказ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className={`cart-drawer__overlay ${open ? "cart-drawer__overlay--visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`cart-drawer ${open ? "cart-drawer--open" : ""}`}>
        <div className="cart-drawer__header">
          <h2>Ваш заказ</h2>
          <button className="cart-drawer__close" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        {items.length === 0 ? (
          <p className="cart-drawer__empty">Корзина пуста</p>
        ) : (
          <div className="cart-drawer__list">
            {items.map((item) => (
              <div key={item.productId} className="cart-drawer__item">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="cart-drawer__item-image" />
                ) : (
                  <div className="cart-drawer__item-image cart-drawer__item-image--placeholder" />
                )}

                <div className="cart-drawer__item-body">
                  <div className="cart-drawer__item-name">{item.name}</div>

                  <div className="cart-drawer__item-row">
                    <div className="cart-drawer__stepper">
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity - 1)}
                        aria-label="Уменьшить количество"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => setQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        aria-label="Увеличить количество"
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-drawer__item-price">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                </div>

                <button
                  className="cart-drawer__remove"
                  onClick={() => removeItem(item.productId)}
                  aria-label="Удалить из корзины"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="cart-drawer__footer">
          <div className="cart-drawer__total">
            <span>Сумма</span>
            <span>{formatPrice(totalAmount)}</span>
          </div>

          {error && <p className="cart-drawer__error">{error}</p>}

          <button
            className="btn cart-drawer__submit"
            disabled={items.length === 0 || submitting}
            onClick={handleCheckout}
          >
            {submitting ? "Отправка..." : "Оформить заказ"}
          </button>
        </div>
      </aside>
    </>
  );
}
