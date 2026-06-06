import { NextFunction, Request, Response, Router } from 'express';
import { db } from '../../core/database/client';

const router = Router();

// Hàm tiện ích loại bỏ tiếng Việt có dấu và ký tự đặc biệt để bảo vệ chuỗi VietQR
export function normalizePaymentInfo(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu tiếng Việt
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '') // Chỉ giữ lại chữ, số và khoảng trắng
    .toUpperCase();
}

// [GET] /api/invoices/:order_id - Kéo thông tin snapshot lịch sử để in hóa đơn
router.get('/:order_id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order_id } = req.params;

    // 1. Kéo dữ liệu tổng hợp của đơn từ View V4 (Đảm bảo 1 query duy nhất)
    const orderSummary = await db('view_orders_summary').where({ order_id }).first();
    
    if (!orderSummary) {
      return res.status(404).json({ 
        success: false, 
        message: 'Không tìm thấy thông tin đơn hàng để xuất hóa đơn.' 
      });
    }

    // 2. Kéo danh sách sản phẩm snapshot bất biến từ order_items
    const items = await db('order_items')
      .where({ order_id })
      .select([
        'snapshot_product_name as product_name',
        'snapshot_material_name as material_name',
        'final_unit_price',
        'quantity',
        'total_item_price'
      ]);

    // 3. Đọc cấu hình ngân hàng từ file môi trường .env
    const BANK_ID = process.env.BANK_ID || 'null'; 
    const ACCOUNT_NO = process.env.BANK_ACCOUNT_NO || 'null';
    const ACCOUNT_NAME = process.env.BANK_ACCOUNT_NAME || 'null';
    
    // Chuẩn hóa nội dung chuyển khoản sạch sẽ theo góp ý của Senior Dev
    const rawInfo = `THANH TOAN DON HANG OD ${order_id}`;
    const cleanInfo = encodeURIComponent(normalizePaymentInfo(rawInfo));
    const amount = orderSummary.total_final_invoice_price;

    // Thiết lập đường dẫn VietQR động chuẩn cấu trúc định dạng NAPAS-247
    const vietQrUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-vietqr_pro.jpg?amount=${amount}&addInfo=${cleanInfo}&accountName=${encodeURIComponent(normalizePaymentInfo(ACCOUNT_NAME))}`;

    // 4. Trả về payload cấu trúc sạch, nhường việc render giao diện lại cho client-side
    res.json({
      success: true,
      data: {
        invoice_id: `INV-${order_id.padStart(4, '0')}`,
        order_id: Number(order_id),
        customer_name: orderSummary.customer_name,
        created_at: orderSummary.created_at,
        status: orderSummary.status,
        items: items.map(item => ({
          product_name: item.product_name,
          material_name: item.material_name,
          final_unit_price: Number(item.final_unit_price),
          quantity: Number(item.quantity),
          total_item_price: Number(item.total_item_price)
        })),
        total_amount: Number(amount),
        payment_info: {
          bank_id: BANK_ID,
          account_no: ACCOUNT_NO,
          account_name: ACCOUNT_NAME,
          qr_code_url: vietQrUrl
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as invoicesRouter };
