import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';
import { updateOperationalConfigSchema } from '../../core/calculation/schemas';

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
    // Defensive defaults: ensure both keys always exist even if DB is missing a seed row.
    // Without this, undefined fields reach the frontend and cause big.js to throw Invalid number.
    const data = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.key] = Number(row.value);
      return acc;
    }, {
      machine_depreciation_per_hour: 0,
      labor_cost_per_minute: 0,
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * [PUT] /api/operational-configs
 * Cập nhật cấu hình vận hành EAV một cách an toàn và bọc trong transaction.
 *
 * Request shape:
 * {
 *   "machine_depreciation_per_hour": 6000,
 *   "labor_cost_per_minute": 600
 * }
 */
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = updateOperationalConfigSchema.parse(req.body);

    await db.transaction(async (trx) => {
      await trx('operational_configs')
        .insert({ key: 'machine_depreciation_per_hour', value: String(payload.machine_depreciation_per_hour) })
        .onConflict('key')
        .merge();

      await trx('operational_configs')
        .insert({ key: 'labor_cost_per_minute', value: String(payload.labor_cost_per_minute) })
        .onConflict('key')
        .merge();
    });

    res.json({
      success: true,
      data: {
        machine_depreciation_per_hour: payload.machine_depreciation_per_hour,
        labor_cost_per_minute: payload.labor_cost_per_minute
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as configsRouter };

