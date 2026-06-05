import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';

const router = Router();

/**
 * [GET] /api/operational-configs
 * Trả về toàn bộ cấu hình vận hành dưới dạng key-value object phẳng
 * để Frontend sử dụng làm tham số cho bộ tính toán real-time.
 *
 * Response shape:
 * {
 *   "success": true,
 *   "data": {
 *     "machine_depreciation_per_hour": 5000,
 *     "labor_cost_per_minute": 500
 *   }
 * }
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await db('operational_configs').select('key', 'value');

    // Chuyển mảng [{key, value}, ...] thành object phẳng {key: value, ...}
    const data = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.key] = Number(row.value);
      return acc;
    }, {});

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

export { router as configsRouter };
