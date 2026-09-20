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
  description: string | null;
  price: string;
  stock: number;
  is_new: boolean;
  images: ProductImage[];
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
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

export type SortOption = "default" | "price_asc" | "price_desc" | "new";
