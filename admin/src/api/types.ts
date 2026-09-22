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
  sku?: string;
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
  login: string;
  is_active: boolean;
  role: UserRole;
  created_at: string;
  company_name: string | null;
  contact_name: string | null;
  cooperation_type: CooperationType | null;
  price_group_id: number | null;
}

export interface ClientCreateInput {
  login: string;
  password: string;
  company_name?: string | null;
  contact_name?: string | null;
  cooperation_type?: CooperationType | null;
  price_group_id?: number | null;
}

export interface ClientProfileUpdateInput {
  login?: string;
  company_name?: string | null;
  contact_name?: string | null;
  cooperation_type?: CooperationType | null;
  price_group_id?: number | null;
}

export interface PasswordResetInput {
  password: string;
}

export interface PriceGroup {
  id: number;
  name: string;
  discount_percent: string | null;
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

// ── История ────────────────────────────────────────────

export interface StockHistoryEntry {
  id: number;
  product_id: number;
  change: number;
  reason: "order" | "manual" | "receipt";
  order_id: number | null;
  unit_cost: string | null;
  created_at: string;
}

export interface StockReceiptInput {
  quantity: number;
  unit_cost: string;
}

export interface PriceHistoryEntry {
  id: number;
  product_id: number;
  old_price: string | null;
  new_price: string;
  created_at: string;
}

// ── Аналитика ──────────────────────────────────────────

export interface TopProduct {
  product_id: number;
  name: string;
  quantity: number;
  revenue: string;
}

export interface TopClient {
  user_id: number;
  login: string;
  company_name: string | null;
  revenue: string;
  orders_count: number;
}

export interface ClientStats {
  orders_count: number;
  total_amount: string;
  last_order_at: string | null;
}

export interface ClientTopProduct {
  product_id: number;
  name: string;
  quantity: number;
}

export interface AnalyticsOverview {
  month_revenue: string;
  month_orders_count: number;
  month_avg_order: string;
  month_margin: string;
  month_margin_percent: string;
  active_products_count: number;
  total_stock: number;
  top_products: TopProduct[];
  top_clients: TopClient[];
}

export interface TurnoverItem {
  product_id: number;
  sku: string;
  name: string;
  stock: number;
  sold_7d: number;
  sold_30d: number;
  sold_90d: number;
}

export interface MonthlyPoint {
  month: string;
  quantity: number;
  revenue: string;
}

export interface ClientMonthlyPoint {
  month: string;
  orders_count: number;
  revenue: string;
}

export interface RevenuePoint {
  month: string;
  revenue: string;
  orders_count: number;
}
