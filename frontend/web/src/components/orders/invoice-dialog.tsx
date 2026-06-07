'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiInvoice, getInvoice } from '@/core/api/client';
import { formatDateTime, formatOrderCode, formatVND } from '@/lib/orders';
import { toPng } from 'html-to-image';
import { AlertCircle, Download, FileText, Printer, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface InvoiceDialogProps {
  orderId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDialog({
  orderId,
  open,
  onOpenChange,
}: InvoiceDialogProps) {
  const [invoice, setInvoice] = useState<ApiInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch invoice details when orderId changes and dialog is opened
  useEffect(() => {
    if (!open || orderId === null) {
      setInvoice(null);
      setError(null);
      return;
    }

    const loadInvoice = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getInvoice(orderId);
        setInvoice(data);
      } catch (err: any) {
        console.error('Lỗi tải hóa đơn:', err);
        setError(err.message || 'Không thể tải thông tin hóa đơn từ máy chủ.');
      } finally {
        setIsLoading(false);
      }
    };

    void loadInvoice();
  }, [open, orderId]);

  // Captures and downloads the invoice container as a PNG image
  const handleDownloadImage = async () => {
    const node = document.getElementById('printable-invoice-content');
    if (!node || !invoice) return;

    setIsDownloading(true);
    try {
      // Small delay to ensure any dynamic rendering/layout is stable
      await new Promise((r) => setTimeout(r, 100));

      const dataUrl = await toPng(node, {
        cacheBust: true, // Fixes potential stale CORS images issues
        backgroundColor: '#ffffff', // Ensures white background
        style: {
          margin: '0',
          padding: '32px',
          borderRadius: '0',
        },
      });

      const link = document.createElement('a');
      link.download = `${invoice.invoice_id || 'invoice'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi xuất hình ảnh:', err);
      alert('Không thể tạo file ảnh hóa đơn do lỗi bảo mật CORS ảnh QR. Vui lòng thử chức năng In hoặc chụp màn hình.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Triggers browser native print dialog
  const handlePrint = () => {
    window.print();
  };

  const workshopName =
    process.env.NEXT_PUBLIC_WORKSHOP_NAME ||
    'BnC LAB - Dịch vụ in 3D chất lượng cao';
  const workshopContact =
    process.env.NEXT_PUBLIC_WORKSHOP_CONTACT || 'Long Xuyên, An Giang, Việt Nam';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border text-foreground overflow-y-auto max-h-[95vh] p-6 no-print focus:outline-none">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="font-mono text-base uppercase tracking-wider text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            Xuất Hóa Đơn Thanh Toán
          </DialogTitle>
        </DialogHeader>

        {/* 1. Loading State */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <span className="text-xs font-mono">Đang nạp dữ liệu snapshot từ máy chủ...</span>
          </div>
        )}

        {/* 2. Error State */}
        {error && (
          <div className="py-12 flex flex-col items-center justify-center text-rose-500 gap-3">
            <AlertCircle className="h-10 w-10 shrink-0" />
            <div className="text-center space-y-1">
              <span className="text-xs font-bold uppercase font-mono tracking-wider block">Lỗi kết nối</span>
              <p className="text-xs max-w-md mx-auto leading-relaxed">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (orderId) {
                  setIsLoading(true);
                  setError(null);
                  getInvoice(orderId)
                    .then(setInvoice)
                    .catch((err) => setError(err.message))
                    .finally(() => setIsLoading(false));
                }
              }}
              className="mt-2 border-border hover:bg-muted font-sans font-semibold text-xs"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* 3. Invoice View */}
        {!isLoading && !error && invoice && (
          <div className="space-y-6 mt-3">
            {/* Invoice card wrapper. Fixed white background for unified image rendering and printing */}
            <div
              id="printable-invoice-content"
              className="bg-white text-black p-8 rounded-xl border border-gray-200 space-y-6 shadow-sm select-text"
            >
              {/* Header: Shop title and Invoice meta */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 border-b border-gray-200 pb-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-bold font-mono text-gray-900 tracking-wide uppercase leading-tight">
                    {workshopName}
                  </h2>
                  <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
                    {workshopContact}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <span className="text-[9px] font-mono font-bold uppercase text-gray-400 block tracking-widest">
                    Mã hóa đơn
                  </span>
                  <span className="text-sm font-mono font-bold text-blue-600 block">
                    {invoice.invoice_id}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono block mt-0.5">
                    Ngày: {formatDateTime(invoice.created_at)}
                  </span>
                </div>
              </div>

              {/* Client info */}
              <div className="grid grid-cols-2 gap-4 text-xs font-sans">
                <div>
                  <span className="font-mono font-bold uppercase text-gray-400 block tracking-wider text-[9px] mb-0.5">
                    Khách hàng
                  </span>
                  <span className="text-xs font-bold text-gray-900 block">
                    {invoice.customer_name}
                  </span>
                </div>
                <div className="text-left sm:text-right">
                  <span className="font-mono font-bold uppercase text-gray-400 block tracking-wider text-[9px] mb-0.5">
                    Đơn hàng tham chiếu
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-900 block">
                    {formatOrderCode(invoice.order_id)}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 font-bold font-mono text-[9px] uppercase tracking-wider">
                      <th className="py-2 px-1 text-left">Sản phẩm</th>
                      <th className="py-2 px-1 text-left">Phôi nhựa</th>
                      <th className="py-2 px-1 text-right">Đơn giá</th>
                      <th className="py-2 px-1 text-center w-12">SL</th>
                      <th className="py-2 px-1 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-2.5 px-1 font-semibold text-gray-900 leading-snug">
                          {item.product_name}
                        </td>
                        <td className="py-2.5 px-1">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-semibold bg-blue-50 border border-blue-100 text-blue-700 uppercase font-mono tracking-wide">
                            {item.material_name}
                          </span>
                        </td>
                        <td className="py-2.5 px-1 text-right font-mono text-gray-600">
                          {formatVND(item.final_unit_price)}
                        </td>
                        <td className="py-2.5 px-1 text-center font-mono font-semibold text-gray-800">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-1 text-right font-mono font-bold text-gray-900">
                          {formatVND(item.total_item_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total amount */}
              <div className="flex justify-between items-center bg-gray-50 px-4 py-3 border border-gray-100 rounded-lg">
                <span className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-widest">
                  Tổng thanh toán:
                </span>
                <span className="text-base font-mono font-bold text-emerald-600">
                  {formatVND(invoice.total_amount)}
                </span>
              </div>

              {/* Payment details + VietQR */}
              <div className="border-t border-gray-200 pt-5 flex flex-col sm:flex-row gap-6 justify-between items-center">
                <div className="space-y-2 flex-1 text-xs text-left w-full">
                  <span className="font-mono font-bold uppercase text-gray-400 block tracking-wider text-[9px]">
                    Thông tin tài khoản thụ hưởng
                  </span>
                  <div className="space-y-1 font-sans text-gray-700 leading-normal">
                    <div>
                      <span className="text-gray-400">Ngân hàng:</span>{' '}
                      <strong className="text-gray-900">{invoice.payment_info.bank_id}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Số tài khoản:</span>{' '}
                      <strong className="text-gray-900 font-mono">{invoice.payment_info.account_no}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Chủ tài khoản:</span>{' '}
                      <strong className="text-gray-900 uppercase">{invoice.payment_info.account_name}</strong>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-center select-none w-full sm:w-auto">
                  <div className="relative border border-gray-200 p-1.5 rounded-lg bg-white shadow-sm">
                    {/* crossOrigin="anonymous" is critical to bypass CORS security block during html-to-image canvas parsing */}
                    <img
                      src={invoice.payment_info.qr_code_url}
                      alt="Mã VietQR"
                      crossOrigin="anonymous"
                      className="w-32 h-32 object-contain"
                    />
                  </div>
                  <span className="text-[8px] text-gray-400 font-mono mt-1 text-center">
                    Quét để thanh toán NAPAS-247
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons (only displayed on page, hidden during print) */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border mt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border hover:bg-muted font-sans font-semibold text-xs"
                disabled={isDownloading}
              >
                Đóng
              </Button>

              <Button
                onClick={handleDownloadImage}
                className="bg-blue-600 hover:bg-blue-500 text-white font-sans font-bold text-xs shadow-sm shadow-blue-950/20"
                disabled={isDownloading}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                {isDownloading ? 'Đang xuất ảnh...' : 'Tải ảnh PNG'}
              </Button>

              <Button
                onClick={handlePrint}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs shadow-sm shadow-emerald-950/20"
                disabled={isDownloading}
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                In / Lưu PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
