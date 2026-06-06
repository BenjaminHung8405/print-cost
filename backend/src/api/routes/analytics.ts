import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';

const router = Router();

/**
 * [GET] /api/analytics/summary
 * Returns general KPI totals and month-by-month financial summary (Revenue, COGS, Profit, Orders).
 */
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monthlyData = await db('view_orders_summary')
      .select([
        db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"),
        db.raw("COUNT(order_id)::int as total_orders"),
        db.raw("SUM(CASE WHEN status IN ('completed', 'delivered', 'shipping') THEN total_final_invoice_price ELSE 0 END)::float as revenue"),
        db.raw("SUM(CASE WHEN status IN ('completed', 'delivered', 'shipping') THEN total_raw_cogs ELSE 0 END)::float as cogs"),
        db.raw("SUM(CASE WHEN status = 'cancelled' AND is_loss_counted = TRUE THEN total_raw_cogs ELSE 0 END)::float as wasted_cogs")
      ])
      .groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
      .orderBy('month', 'asc'); // Ascending order so it draws chronologically left-to-right

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalWastedCogs = 0;
    let totalOrdersCount = 0;

    const formattedMonthly = monthlyData.map((row: any) => {
      const month = row.month;
      const total_orders = row.total_orders;
      const revenue = row.revenue || 0;
      const cogs = row.cogs || 0;
      const wasted_cogs = row.wasted_cogs || 0;
      const profit = revenue - cogs - wasted_cogs;

      totalRevenue += revenue;
      totalCogs += cogs;
      totalWastedCogs += wasted_cogs;
      totalOrdersCount += total_orders;

      return {
        month,
        total_orders,
        revenue,
        cogs,
        wasted_cogs,
        profit,
      };
    });

    const totalProfit = totalRevenue - totalCogs - totalWastedCogs;

    res.json({
      success: true,
      data: {
        totals: {
          total_revenue: totalRevenue,
          total_cogs: totalCogs,
          total_wasted_cogs: totalWastedCogs,
          total_profit: totalProfit,
          total_orders: totalOrdersCount,
        },
        monthly: formattedMonthly,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * [GET] /api/analytics/materials
 * Returns filament consumption stats (in grams) grouped by material type.
 */
router.get('/materials', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db('order_items as oi')
      .join('orders as o', 'oi.order_id', 'o.id')
      .select([
        'oi.snapshot_material_name as material_name',
        db.raw('SUM(oi.snapshot_weight_gram * oi.snapshot_fail_rate * oi.quantity::NUMERIC)::float as total_weight_consumed')
      ])
      .where(function() {
        this.whereIn('o.status', ['printing', 'completed', 'shipping', 'delivered'])
            .orWhere(function() {
              this.where('o.status', 'cancelled').andWhere('o.is_loss_counted', true);
            });
      })
      .groupBy('oi.snapshot_material_name')
      .orderBy('total_weight_consumed', 'desc');

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * [GET] /api/analytics/machines
 * Returns printer statistics (cumulative running hours, hours since maintenance, and flags).
 */
router.get('/machines', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db('order_items as oi')
      .join('orders as o', 'oi.order_id', 'o.id')
      .select(db.raw('COALESCE(SUM(oi.snapshot_print_time_seconds * oi.quantity), 0)::float as total_seconds'))
      .where(function() {
        this.whereIn('o.status', ['printing', 'completed', 'shipping', 'delivered'])
            .orWhere(function() {
              this.where('o.status', 'cancelled').andWhere('o.is_loss_counted', true);
            });
      })
      .first();

    const totalSeconds = result?.total_seconds || 0;
    const totalHours = totalSeconds / 3600;

    const configRow = await db('operational_configs')
      .where({ key: 'maintenance_reset_hours' })
      .first();
    const resetHours = configRow ? Number(configRow.value) : 0;

    const hoursSinceMaintenance = Math.max(0, totalHours - resetHours);
    const maintenanceHoursThreshold = 100; // Ngưỡng bảo trì tra dầu mỡ là 100 giờ máy chạy
    const needsMaintenance = hoursSinceMaintenance >= maintenanceHoursThreshold;

    res.json({
      success: true,
      data: {
        total_print_time_hours: totalHours,
        reset_hours: resetHours,
        hours_since_maintenance: hoursSinceMaintenance,
        maintenance_hours_threshold: maintenanceHoursThreshold,
        needs_maintenance: needsMaintenance,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * [POST] /api/analytics/machines/reset
 * Resets the maintenance running hours counter back to 0.
 */
router.post('/machines/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await db('order_items as oi')
      .join('orders as o', 'oi.order_id', 'o.id')
      .select(db.raw('COALESCE(SUM(oi.snapshot_print_time_seconds * oi.quantity), 0)::float as total_seconds'))
      .where(function() {
        this.whereIn('o.status', ['printing', 'completed', 'shipping', 'delivered'])
            .orWhere(function() {
              this.where('o.status', 'cancelled').andWhere('o.is_loss_counted', true);
            });
      })
      .first();

    const totalSeconds = result?.total_seconds || 0;
    const totalHours = totalSeconds / 3600;

    // Save this current total hours as the maintenance reset mark in database
    await db('operational_configs')
      .insert({
        key: 'maintenance_reset_hours',
        value: totalHours,
        description: 'Số giờ chạy máy tại lần bảo trì gần nhất'
      })
      .onConflict('key')
      .merge();

    res.json({
      success: true,
      data: {
        message: 'Đã đặt lại mốc bảo trì thành công.',
        reset_hours: totalHours,
        hours_since_maintenance: 0,
        needs_maintenance: false
      }
    });
  } catch (error) {
    next(error);
  }
});

export { router as analyticsRouter };
