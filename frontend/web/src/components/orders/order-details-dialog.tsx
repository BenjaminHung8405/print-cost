'use client'

import { Lock } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatVND, formatOrderCode, isOrderLocked } from '@/lib/orders'
import type { ApiOrder } from '@/core/api/client'

interface OrderDetailsDialogProps {
  order: ApiOrder | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
}: OrderDetailsDialogProps) {
  if (!order) return null

  const locked = isOrderLocked(order)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg text-foreground flex items-center gap-2">
            Chi tiết đơn hàng #{formatOrderCode(order.id)}
            {locked && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-rose-400 border border-rose-800 bg-rose-950/50 rounded-full px-2 py-0.5">
                <Lock className="h-3 w-3" />
                Đã khóa cứng
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Customer Info */}
          <div className="pb-4 border-b border-border">
            <p className="text-sm text-muted-foreground">Khách hàng</p>
            <p className="font-semibold text-foreground">{order.customer_name}</p>
            {order.customer_contact && (
              <a
                href={order.customer_contact}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {order.customer_contact}
              </a>
            )}
          </div>

          {/* Ironclad Lock Notice */}
          {locked && (
            <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-3 py-2">
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                Đơn hàng này đã bị khóa cứng vĩnh viễn (Hủy đơn + Tính hao hụt xưởng).
                Mọi thao tác chỉnh sửa đã bị vô hiệu hóa ở cấp cơ sở dữ liệu.
              </p>
            </div>
          )}

          {/* Items Receipt — reads frozen snapshot fields */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Chi tiết sản phẩm ({order.items.length} món)
            </p>

            {order.items.map((item) => (
              <div
                key={item.id}
                className="bg-muted/50 border border-border rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-foreground">
                      {item.snapshot_product_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vật liệu: {item.snapshot_material_name}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-muted-foreground">
                    x{item.quantity}
                  </span>
                </div>

                {/* Frozen snapshot cost breakdown (from DB, not recalculated) */}
                <div className="pt-2 border-t border-border space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Chi phí vật liệu:</span>
                    <span className="font-mono">{formatVND(item.raw_material_cost)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Chi phí máy:</span>
                    <span className="font-mono">{formatVND(item.raw_machine_cost)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Chi phí nhân công:</span>
                    <span className="font-mono">{formatVND(item.raw_labor_cost)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Chi phí phụ kiện:</span>
                    <span className="font-mono">{formatVND(item.raw_fixed_items_cost)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground pt-1 border-t border-border">
                    <span>Giá vốn đơn vị:</span>
                    <span className="font-mono">{formatVND(item.raw_unit_cogs)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs pt-0.5">
                    <span>Biên lợi nhuận snapshot:</span>
                    <span className="font-mono">{(item.snapshot_margin * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-500 pt-1">
                    <span>Giá bán chốt (× {item.quantity}):</span>
                    <span className="font-mono">{formatVND(item.total_item_price)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-muted-foreground">
              <span>Tổng giá vốn:</span>
              <span className="font-mono">{formatVND(order.total_raw_cogs)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-emerald-500">
              <span>Tổng hóa đơn:</span>
              <span className="font-mono">{formatVND(order.total_final_invoice_price)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Lợi nhuận ước tính:</span>
              <span className="font-mono text-emerald-500">
                {formatVND(order.total_final_invoice_price - order.total_raw_cogs)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
