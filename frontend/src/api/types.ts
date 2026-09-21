export interface Category {
  id: number;
  name: string;
}

export interface ProductListItem {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  price: string;
  stock: number;
  is_new: boolean;
  image_url: string | null;
}

export interface ProductImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface ProductDetail {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  category_name: string;
  description: string | null;
  price: string;
  stock: number;
  is_new: boolean;
  images: ProductImage[];
}

/** Минимальная форма, достаточная для добавления в корзину — удовлетворяется и ProductListItem,
 *  и карточкой товара, собранной на странице деталей товара. */
export interface CartableProduct {
  id: number;
  sku: string;
  name: string;
  price: string;
  stock: number;
  image_url: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserProfile {
  id: number;
  login: string;
  is_active: boolean;
  role: "admin" | "user";
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  cooperation_type: string | null;
  price_group_id: number | null;
}

export interface OrderItemOut {
  product_id: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  price: string;
}

export interface OrderOut {
  id: number;
  user_id: number;
  status: string;
  comment: string | null;
  total_amount: string;
  created_at: string;
  items: OrderItemOut[];
}

export interface OrderListItem {
  id: number;
  user_id: number;
  status: string;
  total_amount: string;
  item_count: number;
  created_at: string;
}

export type SortOption = "default" | "price_asc" | "price_desc" | "new";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  processing: "Собирается",
  ready: "Готов",
  delivered: "Доставлен",
  cancelled: "Отменён",
};
