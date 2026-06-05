'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { type Order, formatVND } from '@/lib/orders'

interface OrderDetailsDialogProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDetailsDialog({
  order,
  open,
  onOpenChange,
}: OrderDetailsDialogProps) {
  if (!order) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="font-mono text-lg text-slate-100">
            Chi tiết đơn hàng #{order.code}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {/* Customer Info */}
          <div className="pb-4 border-b border-slate-700">
            <p className="text-sm text-slate-400">Khách hàng</p>
            <p className="font-semibold text-slate-100">{order.customerName}</p>
            {order.customerContact && (
              <p className="text-sm text-blue-400">{order.customerContact}</p>
            )}
          </div>

          {/* Items Receipt */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Chi tiết sản phẩm
            </p>

            {order.items.map((item, index) => (
              <div
                key={item.id}
                className="bg-slate-800 rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-100">
                      {item.productName}
                    </p>
                    <p className="text-xs text-slate-400">
                      Vật liệu: {item.materialName}
                    </p>
                  </div>
                  <span className="font-mono text-sm text-slate-400">
                    x{item.quantity}
                  </span>
                </div>

                {/* Cost Breakdown */}
                <div className="pt-2 border-t border-slate-700 space-y-1 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Chi phí vật liệu:</span>
                    <span className="font-mono">
                      {formatVND(item.rawMaterialCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Chi phí máy:</span>
                    <span className="font-mono">
                      {formatVND(item.rawMachineCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Chi phí nhân công:</span>
                    <span className="font-mono">
                      {formatVND(item.rawLaborCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Chi phí phụ kiện:</span>
                    <span className="font-mono">
                      {formatVND(item.rawFixedItemsCost)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-slate-300 pt-1 border-t border-slate-700">
                    <span>Giá vốn đơn vị:</span>
                    <span className="font-mono">
                      {formatVND(item.rawUnitCogs)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-400 pt-1">
                    <span>Giá bán chốt:</span>
                    <span className="font-mono">
                      {formatVND(item.finalUnitPrice)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-4 border-t border-slate-700 space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Tổng giá vốn:</span>
              <span className="font-mono">{formatVND(order.totalRawCogs)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-emerald-400">
              <span>Tổng hóa đơn:</span>
              <span className="font-mono">
                {formatVND(order.totalFinalInvoicePrice)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-slate-400">
              <span>Lợi nhuận ước tính:</span>
              <span className="font-mono text-emerald-400">
                {formatVND(order.totalFinalInvoicePrice - order.totalRawCogs)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
