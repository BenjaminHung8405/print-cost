'use client'

import { MoreHorizontal, FileText, Eye, ArrowRight } from 'lucide-react'
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
  type Order,
  type OrderStatus,
} from '@/lib/orders'

interface OrderActionsDropdownProps {
  order: Order
  onStatusChange: (orderId: number, newStatus: OrderStatus) => void
  onViewDetails: (order: Order) => void
  onExportInvoice: (order: Order) => void
}

export function OrderActionsDropdown({
  order,
  onStatusChange,
  onViewDetails,
  onExportInvoice,
}: OrderActionsDropdownProps) {
  const nextStates = VALID_NEXT_STATES[order.status]
  const hasNextStates = nextStates.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-slate-700 cursor-pointer transition-colors duration-150"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Mở menu hành động</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-slate-800 border-slate-700"
      >
        {hasNextStates && (
          <>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700">
                <ArrowRight className="mr-2 h-4 w-4" />
                Đổi trạng thái
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-slate-800 border-slate-700">
                {nextStates.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => onStatusChange(order.id, status)}
                    className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700"
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
            <DropdownMenuSeparator className="bg-slate-700" />
          </>
        )}

        <DropdownMenuItem
          onClick={() => onViewDetails(order)}
          className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700"
        >
          <Eye className="mr-2 h-4 w-4" />
          Xem chi tiết
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onExportInvoice(order)}
          className="cursor-pointer hover:bg-slate-700 focus:bg-slate-700 text-blue-400"
        >
          <FileText className="mr-2 h-4 w-4" />
          Xuất hóa đơn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
