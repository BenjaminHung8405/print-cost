// Order status type mapping for the state machine
export type OrderStatus =
  | 'draft'
  | 'printing'
  | 'completed'
  | 'shipping'
  | 'delivered'
  | 'cancelled'

export interface OrderItem {
  id: number
  productName: string
  materialName: string
  quantity: number
  finalUnitPrice: number
  rawMaterialCost: number
  rawMachineCost: number
  rawLaborCost: number
  rawFixedItemsCost: number
  rawUnitCogs: number
}

export interface Order {
  id: number
  code: string
  customerName: string
  customerContact: string | null
  status: OrderStatus
  isLossCounted: boolean
  createdAt: Date
  updatedAt: Date
  items: OrderItem[]
  totalFinalInvoicePrice: number
  totalRawCogs: number
}

// Status display configuration
export const STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string
    className: string
    animate?: boolean
  }
> = {
  draft: {
    label: 'Nháp',
    className:
      'bg-slate-800 text-slate-400 border border-slate-700',
  },
  printing: {
    label: 'Đang in',
    className:
      'bg-blue-950 text-blue-400 border border-blue-800 animate-pulse',
    animate: true,
  },
  completed: {
    label: 'Chờ đóng gói',
    className:
      'bg-purple-950 text-purple-400 border border-purple-800',
  },
  shipping: {
    label: 'Đang giao',
    className:
      'bg-amber-950 text-amber-400 border border-amber-800',
  },
  delivered: {
    label: 'Thành công',
    className:
      'bg-emerald-950 text-emerald-400 border border-emerald-800',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-rose-950 text-rose-400 border border-rose-800',
  },
}

// State machine: valid next states for each status
export const VALID_NEXT_STATES: Record<OrderStatus, OrderStatus[]> = {
  draft: ['printing', 'cancelled'],
  printing: ['completed', 'cancelled'],
  completed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'cancelled'],
  delivered: [], // terminal state
  cancelled: [], // terminal state
}

// Format Vietnamese Dong currency
export function formatVND(amount: number): string {
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Math.round(amount)) + ' đ'
  )
}

// Format datetime in Vietnamese format
export function formatDateTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${hours}:${minutes} - ${day}/${month}/${year}`
}

// Format order items summary
export function formatItemsSummary(items: OrderItem[]): string {
  return items
    .map(
      (item) =>
        `${item.quantity}x ${item.productName} (${item.materialName})`
    )
    .join(', ')
}
