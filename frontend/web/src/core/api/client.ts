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
  is_in_use?: boolean;
}

export interface ApiFixedItem {
  id: number;
  name: string;
  item_type: 'accessory' | 'packaging';
  cost: number;
  quantity: number; // quantity attached to the product template
}

/**
 * ApiFixedItemCatalog — dành cho trang quản lý catalog /configs/fixed-items.
 * Tách biệt với ApiFixedItem (dùng trong product template context).
 */
export interface ApiFixedItemCatalog {
  id: number;
  name: string;
  item_type: 'accessory' | 'packaging';
  cost: number;
}

export type CreateFixedItemPayload = Omit<ApiFixedItemCatalog, 'id'>;

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

/** POST /api/materials — create new plastic material */
export async function createMaterial(
  payload: Omit<ApiMaterial, 'id' | 'is_in_use'>
): Promise<ApiMaterial> {
  return apiFetch<ApiMaterial>('/api/materials', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PUT /api/materials/:id — update plastic material details */
export async function updateMaterial(
  id: number,
  payload: Omit<ApiMaterial, 'id' | 'is_in_use'>
): Promise<ApiMaterial> {
  return apiFetch<ApiMaterial>(`/api/materials/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/materials/:id — delete plastic material */
export async function deleteMaterial(id: number): Promise<void> {
  return apiFetch<void>(`/api/materials/${id}`, {
    method: 'DELETE',
  });
}

/** GET /api/products — fetch all product templates (with fixed_items aggregated) */
export async function getProducts(): Promise<ApiProduct[]> {
  return apiFetch<ApiProduct[]>('/api/products');
}

/** POST /api/products — create new product template */
export async function createProduct(
  payload: Omit<ApiProduct, 'id' | 'material_name' | 'fixed_items'> & {
    fixed_items: { fixed_item_id: number; quantity: number }[];
  }
): Promise<ApiProduct> {
  return apiFetch<ApiProduct>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PUT /api/products/:id — update existing product template */
export async function updateProduct(
  id: number,
  payload: Omit<ApiProduct, 'id' | 'material_name' | 'fixed_items'> & {
    fixed_items: { fixed_item_id: number; quantity: number }[];
  }
): Promise<ApiProduct> {
  return apiFetch<ApiProduct>(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/products/:id — delete product template */
export async function deleteProduct(id: number): Promise<void> {
  return apiFetch<void>(`/api/products/${id}`, {
    method: 'DELETE',
  });
}

/** GET /api/operational-configs — fetch machine & labor cost configs */
export async function getOperationalConfigs(): Promise<ApiOperationalConfigs> {
  return apiFetch<ApiOperationalConfigs>('/api/operational-configs');
}

/** PUT /api/operational-configs — update machine & labor cost configs */
export async function updateOperationalConfigs(
  payload: ApiOperationalConfigs
): Promise<ApiOperationalConfigs> {
  return apiFetch<ApiOperationalConfigs>('/api/operational-configs', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// Fixed Items (Phụ kiện & Bao bì Catalog)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/fixed-items — fetch all fixed item catalog entries */
export async function getFixedItems(): Promise<ApiFixedItemCatalog[]> {
  return apiFetch<ApiFixedItemCatalog[]>('/api/fixed-items');
}

/** POST /api/fixed-items — create new fixed item */
export async function createFixedItem(
  payload: CreateFixedItemPayload
): Promise<ApiFixedItemCatalog> {
  return apiFetch<ApiFixedItemCatalog>('/api/fixed-items', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** PUT /api/fixed-items/:id — update fixed item details */
export async function updateFixedItem(
  id: number,
  payload: CreateFixedItemPayload
): Promise<ApiFixedItemCatalog> {
  return apiFetch<ApiFixedItemCatalog>(`/api/fixed-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** DELETE /api/fixed-items/:id — delete fixed item from catalog */
export async function deleteFixedItem(id: number): Promise<void> {
  return apiFetch<void>(`/api/fixed-items/${id}`, {
    method: 'DELETE',
  });
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

// ─────────────────────────────────────────────────────────────────────────────
// Analytics APIs
// ─────────────────────────────────────────────────────────────────────────────

export interface MonthlyAnalytics {
  month: string;
  total_orders: number;
  revenue: number;
  cogs: number;
  wasted_cogs: number;
  profit: number;
}

export interface AnalyticsSummaryResult {
  totals: {
    total_revenue: number;
    total_cogs: number;
    total_wasted_cogs: number;
    total_profit: number;
    total_orders: number;
  };
  monthly: MonthlyAnalytics[];
}

export interface MaterialAnalytics {
  material_name: string;
  total_weight_consumed: number;
}

export interface MachineAnalytics {
  total_print_time_hours: number;
  reset_hours: number;
  hours_since_maintenance: number;
  maintenance_hours_threshold: number;
  needs_maintenance: boolean;
}

export interface MachineResetResult {
  message: string;
  reset_hours: number;
  hours_since_maintenance: number;
  needs_maintenance: boolean;
}

/** GET /api/analytics/summary — fetch financial KPI metrics and monthly logs */
export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResult> {
  return apiFetch<AnalyticsSummaryResult>('/api/analytics/summary');
}

/** GET /api/analytics/materials — fetch filament consumption weights */
export async function getAnalyticsMaterials(): Promise<MaterialAnalytics[]> {
  return apiFetch<MaterialAnalytics[]>('/api/analytics/materials');
}

/** GET /api/analytics/machines — fetch printer cumulative runtime */
export async function getAnalyticsMachines(): Promise<MachineAnalytics> {
  return apiFetch<MachineAnalytics>('/api/analytics/machines');
}

/** POST /api/analytics/machines/reset — reset running hours and save reset mark */
export async function resetMachineMaintenance(): Promise<MachineResetResult> {
  return apiFetch<MachineResetResult>('/api/analytics/machines/reset', {
    method: 'POST',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoice APIs
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiInvoiceItem {
  product_name: string;
  material_name: string;
  final_unit_price: number;
  quantity: number;
  total_item_price: number;
}

export interface ApiInvoice {
  invoice_id: string;
  order_id: number;
  customer_name: string;
  created_at: string;
  status: string;
  items: ApiInvoiceItem[];
  total_amount: number;
  payment_info: {
    bank_id: string;
    account_no: string;
    account_name: string;
    qr_code_url: string;
  };
}

/** GET /api/invoices/:orderId — fetch invoice details and VietQR payment information */
export async function getInvoice(orderId: number): Promise<ApiInvoice> {
  return apiFetch<ApiInvoice>(`/api/invoices/${orderId}`);
}
