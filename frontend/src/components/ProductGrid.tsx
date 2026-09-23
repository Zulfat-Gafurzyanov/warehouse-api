import type { ProductListItem } from "../api/types";
import { useFavorites } from "../context/FavoritesContext";
import { ProductCard } from "./ProductCard";
import "./ProductGrid.css";

interface ProductGridProps {
  products: ProductListItem[];
  onAddToCart: (product: ProductListItem, quantity: number) => void;
  emptyMessage?: string;
}

export function ProductGrid({ products, onAddToCart, emptyMessage }: ProductGridProps) {
  const { isFavorite, toggle } = useFavorites();

  if (products.length === 0) {
    return <p className="product-grid__empty">{emptyMessage ?? "Товары не найдены."}</p>;
  }

  return (
    <div className="product-grid">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          onAddToCart={onAddToCart}
          isFavorite={isFavorite(p.id)}
          onToggleFavorite={toggle}
        />
      ))}
    </div>
  );
}
