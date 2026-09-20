import type { ProductListItem } from "../api/types";
import { ProductCard } from "./ProductCard";
import "./ProductGrid.css";

interface ProductGridProps {
  products: ProductListItem[];
  onAddToCart: (product: ProductListItem) => void;
}

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  if (products.length === 0) {
    return <p className="product-grid__empty">Товары не найдены.</p>;
  }

  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
      ))}
    </div>
  );
}
