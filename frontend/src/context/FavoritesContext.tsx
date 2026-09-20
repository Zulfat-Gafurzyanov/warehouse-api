import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import type { ProductListItem } from "../api/types";
import { useAuth } from "./AuthContext";

interface FavoritesContextValue {
  favoriteIds: Set<number>;
  isFavorite: (productId: number) => boolean;
  toggle: (product: { id: number }) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    api
      .get<ProductListItem[]>("/favorites?limit=200")
      .then((items) => setFavoriteIds(new Set(items.map((i) => i.id))))
      .catch(() => {
        /* избранное не критично для остального интерфейса */
      });
  }, [isAuthenticated]);

  const toggle = useCallback(
    async (product: { id: number }) => {
      const alreadyFavorite = favoriteIds.has(product.id);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (alreadyFavorite) next.delete(product.id);
        else next.add(product.id);
        return next;
      });
      try {
        if (alreadyFavorite) {
          await api.delete(`/favorites/${product.id}`);
        } else {
          await api.put(`/favorites/${product.id}`);
        }
      } catch {
        // откатываем оптимистичное обновление при ошибке
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (alreadyFavorite) next.add(product.id);
          else next.delete(product.id);
          return next;
        });
      }
    },
    [favoriteIds],
  );

  const isFavorite = useCallback((productId: number) => favoriteIds.has(productId), [favoriteIds]);

  return (
    <FavoritesContext.Provider value={{ favoriteIds, isFavorite, toggle }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
