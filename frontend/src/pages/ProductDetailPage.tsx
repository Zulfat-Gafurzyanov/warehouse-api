import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { ProductDetail } from "../api/types";
import { useCart } from "../context/CartContext";
import { useFavorites } from "../context/FavoritesContext";
import { useToast } from "../context/ToastContext";
import { formatPrice } from "../utils/format";
import "./ProductDetailPage.css";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isFavorite, toggle } = useFavorites();
  const { show } = useToast();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setActiveImage(0);
    setQuantity(1);

    api
      .get<ProductDetail>(`/products/${id}`)
      .then(setProduct)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить товар"))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <p className="product-detail__loading container">Загрузка...</p>;
  if (error || !product) {
    return (
      <div className="container product-detail__error-wrap">
        <p className="product-detail__error">{error ?? "Товар не найден"}</p>
        <Link to="/catalog" className="btn btn--outline">
          Назад в каталог
        </Link>
      </div>
    );
  }

  const outOfStock = product.stock <= 0;
  const images = product.images.length > 0 ? product.images : [{ id: 0, url: "", sort_order: 0 }];
  const favorite = isFavorite(product.id);

  function handleAddToCart() {
    if (!product) return;
    addItem(
      {
        id: product.id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        stock: product.stock,
        image_url: product.images[0]?.url ?? null,
      },
      quantity,
    );
    show(`«${product.name}» добавлено в корзину`);
  }

  return (
    <div className="product-detail container">
      <button className="product-detail__back" onClick={() => navigate(-1)}>
        ← Назад
      </button>

      <div className="product-detail__layout">
        <div className="product-detail__gallery">
          <div className="product-detail__main-image">
            {product.is_new && <span className="product-detail__badge">Новинка</span>}
            {images[activeImage]?.url ? (
              <img src={images[activeImage].url} alt={product.name} />
            ) : (
              <div className="product-detail__main-image--placeholder" />
            )}
          </div>

          {product.images.length > 1 && (
            <div className="product-detail__thumbs">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  className={`product-detail__thumb ${i === activeImage ? "product-detail__thumb--active" : ""}`}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="product-detail__info">
          <h1>{product.name}</h1>
          <div className="product-detail__sku">Артикул: {product.sku}</div>
          <div className="product-detail__category">Категория: {product.category_name}</div>

          <div className="product-detail__price">{formatPrice(product.price)}</div>
          <div className={`product-detail__stock ${outOfStock ? "product-detail__stock--out" : ""}`}>
            {outOfStock ? "Нет в наличии" : `В наличии: ${product.stock} шт.`}
          </div>

          {product.description && (
            <p className="product-detail__description">{product.description}</p>
          )}

          {!outOfStock && (
            <div className="product-detail__quantity">
              <span>Количество:</span>
              <div className="product-detail__stepper">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}>+</button>
              </div>
            </div>
          )}

          <div className="product-detail__actions">
            <button className="btn product-detail__add" disabled={outOfStock} onClick={handleAddToCart}>
              {outOfStock ? "Нет в наличии" : "Добавить в корзину"}
            </button>
            <button
              className={`btn btn--outline product-detail__favorite ${favorite ? "product-detail__favorite--active" : ""}`}
              onClick={() => toggle(product)}
            >
              {favorite ? "В избранном ✓" : "В избранное"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
