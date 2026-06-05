'use client';

import { Clock, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatVND, formatTime, type OrderTotals } from '@/lib/pricing';

interface PricingReceiptProps {
  totals: OrderTotals | null; // null when bootstrap data hasn't loaded yet
  onConfirm: () => void;
  isValid: boolean;
  isSubmitting?: boolean;
}

export function PricingReceipt({ totals, onConfirm, isValid, isSubmitting = false }: PricingReceiptProps) {
  const empty = !totals || (totals.totalCOGS === 0 && totals.totalPrice === 0);

  return (
    <div className="sticky top-6">
      <div className="bg-secondary border border-border rounded-xl p-6">
        {/* Card Header */}
        <div className="mb-6">
          <h2 className="font-mono font-bold text-base text-foreground uppercase tracking-wide">
            HÓA ĐƠN ĐƠN HÀNG
          </h2>
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">
              Tổng thời gian máy chạy:{' '}
              {totals ? formatTime(totals.totalPrintTimeSeconds) : '—'}
            </span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Chi phí nhựa phôi</span>
            <span className="font-mono text-foreground">
              {totals ? formatVND(totals.totalMaterialCost) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Chi phí điện &amp; khấu hao</span>
            <span className="font-mono text-foreground">
              {totals ? formatVND(totals.totalMachineCost) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Chi phí công thợ</span>
            <span className="font-mono text-foreground">
              {totals ? formatVND(totals.totalLaborCost) : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Chi phí bao bì &amp; phụ kiện</span>
            <span className="font-mono text-foreground">
              {totals ? formatVND(totals.totalFixedItemsCost) : '—'}
            </span>
          </div>
        </div>

        {/* Dashed Separator */}
        <hr className="border-dashed border-border my-4" />

        {/* COGS Row */}
        <div className="flex justify-between items-center">
          <span className="font-medium text-foreground">Tổng giá vốn (COGS)</span>
          <span className="font-mono font-semibold text-lg text-foreground">
            {totals ? formatVND(totals.totalCOGS) : '—'}
          </span>
        </div>

        {/* Dashed Separator */}
        <hr className="border-dashed border-border my-4" />

        {/* Grand Total */}
        <div className="text-right">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            TỔNG TIỀN PHẢI THU (LÀM TRÒN)
          </p>
          <p className={`font-mono text-3xl font-bold ${empty ? 'text-muted-foreground' : 'text-emerald-500'}`}>
            {totals ? formatVND(totals.totalPrice) : '0 đ'}
          </p>
          <p className="text-xs text-muted-foreground italic mt-1">
            (Đã áp dụng biên lợi nhuận cấu hình theo từng mẫu)
          </p>
        </div>

        {/* Confirm Button */}
        <Button
          type="submit"
          onClick={onConfirm}
          disabled={!isValid || isSubmitting}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base py-6 rounded-lg mt-6 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed h-14 cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Đang tạo đơn hàng...
            </>
          ) : (
            <>
              <Zap className="h-5 w-5 mr-2" />
              XÁC NHẬN CHỐT ĐƠN
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
