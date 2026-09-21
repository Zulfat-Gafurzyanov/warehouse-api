import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { OrderOut, ProductListItem } from "../api/types";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { formatPrice } from "../utils/format";
import "./CartDrawer.css";

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalAmount, addItem, removeItem, setQuantity, clear } = useCart();
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ProductListItem[]>([]);

  useEffect(() => {
    if (!open) return;
    api
      .get<ProductListItem[]>("/products?limit=30")
      .then(setRecommendations)
      .catch(() => {
        /* рекомендации необязательны — просто не покажем блок */
      });
  }, [open]);

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

  const cartProductIds = new Set(items.map((i) => i.productId));
  const visibleRecommendations = recommendations
    .filter((p) => !cartProductIds.has(p.id) && p.stock > 0)
    .sort((a, b) => Number(b.is_new) - Number(a.is_new))
    .slice(0, 6);

  function handleAddRecommendation(product: ProductListItem) {
    addItem(product);
    show(`«${product.name}» добавлено в корзину`);
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
          <div className="cart-drawer__scroll">
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

            {visibleRecommendations.length > 0 && (
              <div className="cart-drawer__recommendations">
                <div className="cart-drawer__recommendations-title">
                  Посмотрите также — новинки и то, чего нет в корзине
                </div>
                <div className="cart-drawer__recommendations-list">
                  {visibleRecommendations.map((p) => (
                    <div key={p.id} className="cart-drawer__rec-card">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="cart-drawer__rec-image" />
                      ) : (
                        <div className="cart-drawer__rec-image cart-drawer__rec-image--placeholder" />
                      )}
                      <div className="cart-drawer__rec-name">{p.name}</div>
                      <div className="cart-drawer__rec-price">{formatPrice(p.price)}</div>
                      <button
                        className="btn btn--outline cart-drawer__rec-add"
                        onClick={() => handleAddRecommendation(p)}
                      >
                        + В корзину
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
