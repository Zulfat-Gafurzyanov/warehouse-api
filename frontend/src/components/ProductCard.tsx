import type { ProductListItem } from "../api/types";
import { formatPrice } from "../utils/format";
import "./ProductCard.css";

interface ProductCardProps {
  product: ProductListItem;
  onAddToCart: (product: ProductListItem) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const outOfStock = product.stock <= 0;

  return (
    <div className="product-card">
      <div className="product-card__image-wrap">
        {product.is_new && <span className="product-card__badge">Новинка</span>}
        {product.image_url ? (
          <img className="product-card__image" src={product.image_url} alt={product.name} />
        ) : (
          <div className="product-card__image product-card__image--placeholder" />
        )}
      </div>

      <div className="product-card__name">{product.name}</div>
      <div className="product-card__price">{formatPrice(product.price)}</div>

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
