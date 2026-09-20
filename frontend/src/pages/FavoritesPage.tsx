import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { ProductListItem } from "../api/types";
import { ProductGrid } from "../components/ProductGrid";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useToast } from "../context/ToastContext";
import "./FavoritesPage.css";

export function FavoritesPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addItem } = useCart();
  const { show } = useToast();
  const { favoriteIds } = useFavorites();

  useEffect(() => {
    setIsLoading(true);
    api
      .get<ProductListItem[]>("/favorites?limit=200")
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить избранное"))
      .finally(() => setIsLoading(false));
  }, []);

  // Синхронизируемся с сердечками: если товар убрали из избранного (в т.ч. на этой же странице),
  // он должен пропасть из списка без перезагрузки.
  const visibleProducts = products.filter((p) => favoriteIds.has(p.id));

  function handleAddToCart(product: ProductListItem) {
    addItem(product);
    show(`«${product.name}» добавлено в корзину`);
  }

  return (
    <div className="favorites-page">
      <div className="container">
        <h1>Избранное</h1>

        {error && <p className="favorites-page__error">{error}</p>}

        {isLoading ? (
          <p className="favorites-page__loading">Загрузка...</p>
        ) : (
          <ProductGrid
            products={visibleProducts}
            onAddToCart={handleAddToCart}
            emptyMessage="В избранном пока пусто — добавляйте товары через сердечко в каталоге."
          />
        )}
      </div>
    </div>
  );
}
