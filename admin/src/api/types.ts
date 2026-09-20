export interface Category {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: number;
  url: string;
  sort_order: number;
}

export interface ProductAdmin {
  id: number;
  sku: string;
  name: string;
  category_id: number;
  description: string | null;
  cost_price: string;
  base_price: string;
  stock: number;
  is_active: boolean;
  is_new: boolean;
  created_at: string;
  updated_at: string;
  images: ProductImage[];
}

export interface ProductCreateInput {
  sku: string;
  name: string;
  category_id: number;
  description?: string | null;
  cost_price?: string;
  base_price: string;
  stock?: number;
  is_new?: boolean;
  image_urls?: string[];
}

export interface ProductUpdateInput {
  name?: string;
  category_id?: number;
  description?: string | null;
  cost_price?: string;
  base_price?: string;
  stock?: number;
  is_active?: boolean;
  is_new?: boolean;
  image_urls?: string[];
}

export type UserRole = "user" | "admin";
export type CooperationType = "buyout" | "consignment" | "custom";

export const COOPERATION_LABELS: Record<CooperationType, string> = {
  buyout: "Выкуп",
  consignment: "Реализация",
  custom: "Индивидуальные условия",
};

export interface UserProfile {
  id: number;
  email: string;
  is_active: boolean;
  role: UserRole;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  cooperation_type: CooperationType | null;
  price_group_id: number | null;
}

export interface ClientCreateInput {
  email: string;
  password: string;
  company_name?: string | null;
  contact_name?: string | null;
  cooperation_type?: CooperationType | null;
  price_group_id?: number | null;
}

export interface ClientProfileUpdateInput {
  company_name?: string | null;
  contact_name?: string | null;
  cooperation_type?: CooperationType | null;
  price_group_id?: number | null;
}

export interface PriceGroup {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface GroupPrice {
  price_group_id: number;
  product_id: number;
  price: string;
  product_name: string;
  product_sku: string;
}

export interface UserPrice {
  user_id: number;
  product_id: number;
  price: string;
  product_name: string;
  product_sku: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export type OrderStatus =
  | "new"
  | "confirmed"
  | "processing"
  | "ready"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  confirmed: "Подтверждён",
  processing: "Собирается",
  ready: "Готов",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  "new",
  "confirmed",
  "processing",
  "ready",
  "delivered",
  "cancelled",
];

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
  status: OrderStatus;
  comment: string | null;
  total_amount: string;
  created_at: string;
  items: OrderItemOut[];
}

export interface OrderListItem {
  id: number;
  user_id: number;
  status: OrderStatus;
  total_amount: string;
  item_count: number;
  created_at: string;
}
