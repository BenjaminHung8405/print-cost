'use client'

import { STATUS_CONFIG, type OrderStatus } from '@/lib/orders'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${config.className}`}
    >
      {config.label}
    </span>
  )
}
