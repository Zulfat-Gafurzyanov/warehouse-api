import type { MouseEvent } from "react";
import { Link } from "react-router-dom";
import type { ProductListItem } from "../api/types";
import { formatPrice } from "../utils/format";
import "./ProductCard.css";

interface ProductCardProps {
  product: ProductListItem;
  onAddToCart: (product: ProductListItem) => void;
  isFavorite: boolean;
  onToggleFavorite: (product: { id: number }) => void;
}

export function ProductCard({
  product,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
}: ProductCardProps) {
  const outOfStock = product.stock <= 0;

  function handleFavoriteClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(product);
  }

  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__link">
        <div className="product-card__image-wrap">
          {product.is_new && <span className="product-card__badge">Новинка</span>}

          <button
            className={`product-card__favorite ${isFavorite ? "product-card__favorite--active" : ""}`}
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? "Убрать из избранного" : "Добавить в избранное"}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={isFavorite ? "currentColor" : "none"}>
              <path
                d="M12 20.5s-7.5-4.6-10-9.3C.5 8 2 4.5 5.4 4c2-.3 3.9.6 5.1 2.3.3.4.7.4 1 0C12.7 4.6 14.6 3.7 16.6 4c3.4.5 4.9 4 3.4 7.2-2.5 4.7-8 9.3-8 9.3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {product.image_url ? (
            <img className="product-card__image" src={product.image_url} alt={product.name} />
          ) : (
            <div className="product-card__image product-card__image--placeholder" />
          )}
        </div>

        <div className="product-card__name">{product.name}</div>
      </Link>

      <div className="product-card__price">{formatPrice(product.price)}</div>
      <div className={`product-card__stock ${outOfStock ? "product-card__stock--out" : ""}`}>
        {outOfStock ? "Нет в наличии" : `В наличии: ${product.stock} шт.`}
      </div>

      <button
        className="btn product-card__btn"
        disabled={outOfStock}
        onClick={() => onAddToCart(product)}
      >
        {outOfStock ? "Нет в наличии" : "В корзину"}
      </button>
    </div>
  );
}
