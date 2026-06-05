/**
 * PrintCost Frontend API Client
 *
 * Thin fetch wrapper around the Express backend.
 * Base URL is resolved from NEXT_PUBLIC_API_URL (falls back to localhost:8080).
 *
 * All functions throw an Error with the backend's Vietnamese `message` field
 * so callers can surface user-friendly error text directly in the UI.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  const json = await res.json();

  if (!res.ok) {
    // Surface the backend's Vietnamese error message directly to the caller
    throw new Error(
      json?.message ?? `HTTP ${res.status}: Lỗi không xác định từ máy chủ`
    );
  }

  return json.data as T;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types — mirrors Backend DB schema + API response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiMaterial {
  id: number;
  name: string;
  price_per_kg: number;
  fail_rate: number;
  default_margin: number;
}

export interface ApiFixedItem {
  id: number;
  name: string;
  item_type: 'accessory' | 'packaging';
  cost: number;
  quantity: number; // quantity attached to the product template
}

export interface ApiProduct {
  id: number;
  name: string;
  material_id: number;
  material_name: string;
  weight_gram: number;
  print_time_seconds: number;
  labor_time_minutes: number;
  margin_override: number | null;
  fixed_items: ApiFixedItem[];
}

export interface ApiOperationalConfigs {
  machine_depreciation_per_hour: number;
  labor_cost_per_minute: number;
}

export interface ApiOrderItem {
  id: number;
  product_id: number | null;
  snapshot_product_name: string;
  snapshot_material_name: string;
  snapshot_weight_gram: number;
  snapshot_print_time_seconds: number;
  snapshot_labor_time_minutes: number;
  snapshot_fail_rate: number;
  snapshot_margin: number;
  quantity: number;
  final_unit_price: number;
  raw_material_cost: number;
  raw_machine_cost: number;
  raw_labor_cost: number;
  raw_fixed_items_cost: number;
  raw_unit_cogs: number;
  total_item_price: number;
}

export type OrderStatus =
  | 'draft'
  | 'printing'
  | 'completed'
  | 'shipping'
  | 'delivered'
  | 'cancelled';

export interface ApiOrder {
  id: number;
  customer_name: string;
  customer_contact: string | null;
  status: OrderStatus;
  is_loss_counted: boolean;
  calculation_version: number;
  created_at: string;
  updated_at: string;
  items: ApiOrderItem[];
  total_raw_cogs: number;
  total_final_invoice_price: number;
}

export interface CreateOrderPayload {
  customer_name: string;
  customer_contact: string | null;
  items: Array<{
    product_id: number;
    quantity: number;
    price_override?: number | null;
  }>;
}

export interface CreateOrderResult {
  order_id: number;
  customer_name: string;
  customer_contact: string | null;
  status: OrderStatus;
  calculation_version: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API functions
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/materials — fetch all plastic materials */
export async function getMaterials(): Promise<ApiMaterial[]> {
  return apiFetch<ApiMaterial[]>('/api/materials');
}

/** GET /api/products — fetch all product templates (with fixed_items aggregated) */
export async function getProducts(): Promise<ApiProduct[]> {
  return apiFetch<ApiProduct[]>('/api/products');
}

/** GET /api/operational-configs — fetch machine & labor cost configs */
export async function getOperationalConfigs(): Promise<ApiOperationalConfigs> {
  return apiFetch<ApiOperationalConfigs>('/api/operational-configs');
}

/** GET /api/orders — fetch all orders with aggregated order items */
export async function getOrders(): Promise<ApiOrder[]> {
  return apiFetch<ApiOrder[]>('/api/orders');
}

/** GET /api/orders/:id — fetch single order with full snapshot detail */
export async function getOrderById(id: number): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/api/orders/${id}`);
}

/** POST /api/orders — create new order */
export async function createOrder(
  payload: CreateOrderPayload
): Promise<CreateOrderResult> {
  return apiFetch<CreateOrderResult>('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PATCH /api/orders/:id — update order status (State Machine transition) */
export async function updateOrderStatus(
  id: number,
  status: OrderStatus,
  isLossCounted: boolean = false
): Promise<ApiOrder> {
  return apiFetch<ApiOrder>(`/api/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status, is_loss_counted: isLossCounted }),
  });
}
