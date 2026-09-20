import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api/client";
import type { Category, ProductListItem, SortOption } from "../api/types";
import { CategorySidebar } from "../components/CategorySidebar";
import { ProductGrid } from "../components/ProductGrid";
import { SortDropdown } from "../components/SortDropdown";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import "./CatalogPage.css";

export function CatalogPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [sort, setSort] = useState<SortOption>("default");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addItem } = useCart();
  const { show } = useToast();

  useEffect(() => {
    api
      .get<Category[]>("/categories")
      .then(setCategories)
      .catch(() => {
        /* категории не критичны — просто не покажем сайдбар с фильтрами */
      });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ limit: "100" });
    if (selectedCategory !== null) params.set("category_id", String(selectedCategory));

    api
      .get<ProductListItem[]>(`/products?${params.toString()}`)
      .then(setProducts)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить каталог"))
      .finally(() => setIsLoading(false));
  }, [selectedCategory]);

  const sortedProducts = useMemo(() => {
    const list = [...products];
    switch (sort) {
      case "price_asc":
        return list.sort((a, b) => Number(a.price) - Number(b.price));
      case "price_desc":
        return list.sort((a, b) => Number(b.price) - Number(a.price));
      case "new":
        return list.sort((a, b) => Number(b.is_new) - Number(a.is_new));
      default:
        return list;
    }
  }, [products, sort]);

  function handleAddToCart(product: ProductListItem) {
    addItem(product);
    show(`«${product.name}» добавлено в корзину`);
  }

  return (
    <div className="catalog-page">
      <div className="catalog-hero">
        <div className="container">
          <h1>Каталог</h1>
          <p>Опт для постоянных клиентов — цены и остатки видны только вам</p>
        </div>
      </div>

      <div className="container catalog-layout">
        <CategorySidebar
          categories={categories}
          selectedId={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <div className="catalog-content">
          <div className="catalog-content__toolbar">
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {error && <p className="catalog-content__error">{error}</p>}

          {isLoading ? (
            <p className="catalog-content__loading">Загрузка...</p>
          ) : (
            <ProductGrid products={sortedProducts} onAddToCart={handleAddToCart} />
          )}
        </div>
      </div>
    </div>
  );
}
