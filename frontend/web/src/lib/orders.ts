/**
 * Frontend Order types, state machine config, and display helpers.
 * Types mirror exactly the shapes returned by the Backend API client (core/api/client.ts).
 */

// Re-export from API client so the UI can import from one place
export type { OrderStatus, ApiOrder as Order, ApiOrderItem as OrderItem } from '@/core/api/client';

import type { ApiOrder, OrderStatus } from '@/core/api/client';

// ─────────────────────────────────────────────────────────────────────────────
// Status display configuration
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    className: string;
    animate?: boolean;
  }
> = {
  draft: {
    label: 'Nháp',
    className: 'bg-slate-800 text-slate-400 border border-slate-700',
  },
  printing: {
    label: 'Đang in',
    className: 'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse',
    animate: true,
  },
  completed: {
    label: 'Chờ đóng gói',
    className: 'bg-purple-950 text-purple-400 border border-purple-800',
  },
  shipping: {
    label: 'Đang giao',
    className: 'bg-amber-950 text-amber-400 border border-amber-800',
  },
  delivered: {
    label: 'Thành công',
    className: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-rose-950 text-rose-400 border border-rose-800',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// State Machine: valid next states for each status
// ─────────────────────────────────────────────────────────────────────────────

export const VALID_NEXT_STATES: Record<OrderStatus, OrderStatus[]> = {
  draft:     ['printing', 'cancelled'],
  printing:  ['completed', 'cancelled'],
  completed: ['shipping', 'cancelled'],
  shipping:  ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * Returns true when an order is permanently locked (cancelled + loss counted).
 * Used throughout the UI to hide/disable edit controls.
 */
export function isOrderLocked(order: Pick<ApiOrder, 'status' | 'is_loss_counted'>): boolean {
  return order.status === 'cancelled' && order.is_loss_counted === true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Format Vietnamese Dong. Example: 50000 → "50.000 đ" */
export function formatVND(amount: number): string {
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) + ' đ'
  );
}

/** Format datetime in Vietnamese HH:MM - DD/MM/YYYY format */
export function formatDateTime(dateInput: Date | string): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const hours   = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const day     = date.getDate().toString().padStart(2, '0');
  const month   = (date.getMonth() + 1).toString().padStart(2, '0');
  const year    = date.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
}

/** Summarise order items for the table cell tooltip */
export function formatItemsSummary(
  items: Array<{ snapshot_product_name: string; snapshot_material_name: string; quantity: number }>
): string {
  return items
    .map(item => `${item.quantity}x ${item.snapshot_product_name} (${item.snapshot_material_name})`)
    .join(', ');
}

/**
 * Generate the order code display string from a numeric ID.
 * Matches the format used in the mock data: OD-XXXX
 */
export function formatOrderCode(id: number): string {
  return `OD-${String(id).padStart(4, '0')}`;
}
