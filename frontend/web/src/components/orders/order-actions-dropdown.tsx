'use client'

import { MoreHorizontal, FileText, Eye, ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  STATUS_CONFIG,
  VALID_NEXT_STATES,
  isOrderLocked,
  type OrderStatus,
} from '@/lib/orders'
import type { ApiOrder } from '@/core/api/client'

interface OrderActionsDropdownProps {
  order: ApiOrder
  onStatusChange: (orderId: number, newStatus: OrderStatus) => void
  onViewDetails: (order: ApiOrder) => void
  onExportInvoice: (order: ApiOrder) => void
}

export function OrderActionsDropdown({
  order,
  onStatusChange,
  onViewDetails,
  onExportInvoice,
}: OrderActionsDropdownProps) {
  const locked = isOrderLocked(order)
  const nextStates = locked ? [] : (VALID_NEXT_STATES[order.status] ?? [])
  const hasNextStates = nextStates.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-150"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Mở menu hành động</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 bg-popover border-border text-popover-foreground"
      >
        {/* Locked indicator — shown instead of state-change options */}
        {locked && (
          <>
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-rose-400">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Đơn hàng đã bị khóa cứng</span>
            </div>
            <DropdownMenuSeparator className="bg-border" />
          </>
        )}

        {/* Status transition sub-menu — hidden when locked */}
        {hasNextStates && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer hover:bg-muted focus:bg-muted">
                <ArrowRight className="mr-2 h-4 w-4" />
                Đổi trạng thái
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover border-border text-popover-foreground">
                {nextStates.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onStatusChange(order.id, status)}
                    className="cursor-pointer hover:bg-muted focus:bg-muted"
                  >
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${STATUS_CONFIG[status].className}`}
                    >
                      {STATUS_CONFIG[status].label}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-border" />
          </>
        )}

        <DropdownMenuItem
          onClick={() => onViewDetails(order)}
          className="cursor-pointer hover:bg-muted focus:bg-muted"
        >
          <Eye className="mr-2 h-4 w-4" />
          Xem chi tiết
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onExportInvoice(order)}
          className="cursor-pointer hover:bg-muted focus:bg-muted text-blue-600 dark:text-blue-400"
        >
          <FileText className="mr-2 h-4 w-4" />
          Xuất hóa đơn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
