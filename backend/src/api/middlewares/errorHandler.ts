import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // 1. Trap Zod Validation Errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu nhập vào không hợp lệ hoặc sai định dạng toán học',
      errors: err.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
    });
  }

  // 2. Trap PostgreSQL Database Violations (Knex Exceptions)
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique key violation
        return res.status(409).json({ 
          success: false, 
          message: 'Dữ liệu này đã tồn tại (Bị trùng tên danh mục).' 
        });
      case '23514': // CHECK constraint violation
        return res.status(400).json({ 
          success: false, 
          message: 'Yêu cầu bị từ chối: Vi phạm giới hạn miền giá trị toán học (Số lượng/Giá trị phải lớn hơn 0).' 
        });
      case '23503': // Foreign key violation
        return res.status(400).json({ 
          success: false, 
          message: 'Không thể thực hiện thao tác do dữ liệu đang được liên kết trong các Sản phẩm hoặc Đơn hàng khác.' 
        });
      case 'P0001': // Custom trigger exception (e.g. Ironclad Lock trigger)
        return res.status(409).json({ 
          success: false, 
          message: `Vi phạm luật vận hành xưởng: ${err.message.replace(/^error:\s*/i, '')}` 
        });
    }
  }

  // 3. Fallback for general server exceptions
  console.error('🔴 [BACKEND CRITICAL EXCEPTION]:', err);
  return res.status(500).json({
    success: false,
    message: err.message || 'Hệ thống gặp sự cố bất ngờ. Vui lòng kiểm tra log Docker của Mac Mini M4.'
  });
}
