import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';
import { createOrderSchema } from '../../core/calculation/schemas';
import { calculateProductCosts, roundTo100 } from '../../core/calculation/engine';
import { z } from 'zod';
import Big from 'big.js';

const router = Router();

// State Machine: valid next states for each status (mirrors frontend lib/orders.ts)
const VALID_NEXT_STATES: Record<string, string[]> = {
  draft:     ['printing', 'cancelled'],
  printing:  ['completed', 'cancelled'],
  completed: ['shipping', 'cancelled'],
  shipping:  ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

// Validation schema for PATCH request
const patchOrderSchema = z.object({
  status: z.enum(['draft', 'printing', 'completed', 'shipping', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Trạng thái đơn hàng không hợp lệ' }),
  }),
  is_loss_counted: z.boolean().optional().default(false),
});

// ─────────────────────────────────────────────────────────────────────────────
// [GET] List all orders — queries view_orders_summary + aggregates items in 1 SQL
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await db('view_orders_summary as v')
      .leftJoin('order_items as oi', 'v.order_id', 'oi.order_id')
      .select([
        'v.order_id as id',
        'v.customer_name',
        db.raw("COALESCE(v.status::TEXT, 'draft') as status"),
        'v.is_loss_counted',
        'v.calculation_version',
        db.raw('v.total_raw_cogs::FLOAT as total_raw_cogs'),
        db.raw('v.total_final_invoice_price::FLOAT as total_final_invoice_price'),
        'v.created_at',
        'v.updated_at',
        db.raw(`
          COALESCE(
            json_agg(
              json_build_object(
                'id',                   oi.id,
                'product_id',           oi.product_id,
                'snapshot_product_name',oi.snapshot_product_name,
                'snapshot_material_name',oi.snapshot_material_name,
                'quantity',             oi.quantity,
                'final_unit_price',     oi.final_unit_price::FLOAT,
                'raw_material_cost',    oi.raw_material_cost::FLOAT,
                'raw_machine_cost',     oi.raw_machine_cost::FLOAT,
                'raw_labor_cost',       oi.raw_labor_cost::FLOAT,
                'raw_fixed_items_cost', oi.raw_fixed_items_cost::FLOAT,
                'raw_unit_cogs',        oi.raw_unit_cogs::FLOAT,
                'total_item_price',     oi.total_item_price::FLOAT,
                'snapshot_batch_quantity', oi.snapshot_batch_quantity
              )
            ) FILTER (WHERE oi.id IS NOT NULL), '[]'
          ) as items
        `)
      ])
      .groupBy(
        'v.order_id', 'v.customer_name', 'v.status', 'v.is_loss_counted',
        'v.calculation_version', 'v.total_raw_cogs',
        'v.total_final_invoice_price', 'v.created_at', 'v.updated_at'
      )
      .orderBy('v.created_at', 'desc');

    // Also fetch customer_contact from orders table (view doesn't expose it)
    const contacts = await db('orders').select('id', 'customer_contact');
    const contactMap = new Map(contacts.map(c => [c.id, c.customer_contact]));

    const enriched = orders.map(o => ({
      ...o,
      customer_contact: contactMap.get(o.id) ?? null,
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// [GET] Get order detail by ID — single JOIN query, zero N+1
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 1 JOIN query: orders + order_items aggregated via json_agg
    const [order] = await db('orders as o')
      .leftJoin('order_items as oi', 'o.id', 'oi.order_id')
      .select([
        'o.id',
        'o.customer_name',
        'o.customer_contact',
        db.raw("o.status::TEXT as status"),
        'o.is_loss_counted',
        'o.calculation_version',
        'o.created_at',
        'o.updated_at',
        db.raw(`
          COALESCE(
            json_agg(
              json_build_object(
                'id',                    oi.id,
                'product_id',            oi.product_id,
                'snapshot_product_name', oi.snapshot_product_name,
                'snapshot_material_name',oi.snapshot_material_name,
                'snapshot_weight_gram',  oi.snapshot_weight_gram::FLOAT,
                'snapshot_print_time_seconds', oi.snapshot_print_time_seconds,
                'snapshot_labor_time_minutes', oi.snapshot_labor_time_minutes,
                'snapshot_fail_rate',    oi.snapshot_fail_rate::FLOAT,
                'snapshot_margin',       oi.snapshot_margin::FLOAT,
                'quantity',              oi.quantity,
                'final_unit_price',      oi.final_unit_price::FLOAT,
                'raw_material_cost',     oi.raw_material_cost::FLOAT,
                'raw_machine_cost',      oi.raw_machine_cost::FLOAT,
                'raw_labor_cost',        oi.raw_labor_cost::FLOAT,
                'raw_fixed_items_cost',  oi.raw_fixed_items_cost::FLOAT,
                'raw_unit_cogs',         oi.raw_unit_cogs::FLOAT,
                'total_item_price',      oi.total_item_price::FLOAT,
                'snapshot_batch_quantity', oi.snapshot_batch_quantity
              )
            ) FILTER (WHERE oi.id IS NOT NULL), '[]'
          ) as items
        `)
      ])
      .where('o.id', id)
      .groupBy('o.id');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    // Compute totals from aggregated items (mirrors view_orders_summary logic)
    const items: any[] = order.items ?? [];
    const total_raw_cogs = items.reduce(
      (sum: number, item: any) => sum + (item.raw_unit_cogs * item.quantity), 0
    );
    const total_final_invoice_price = items.reduce(
      (sum: number, item: any) => sum + item.total_item_price, 0
    );

    res.json({
      success: true,
      data: { ...order, total_raw_cogs, total_final_invoice_price },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// [POST] Create a new order with snapshots (Ironclad Transaction)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate the request body structure before starting the transaction (Fail-fast & Save DB Pool)
    const validatedOrder = createOrderSchema.parse(req.body);

    // 2. Fetch global operational configurations once outside the transaction & loop (Avoid N+1 queries)
    const configRows = await db('operational_configs').select('*');
    const machineDepr = configRows.find(c => c.key === 'machine_depreciation_per_hour')?.value || 0;
    const laborCost = configRows.find(c => c.key === 'labor_cost_per_minute')?.value || 0;

    // 3. Start DB transaction
    const trx = await db.transaction();
    
    try {
      // 4. Create the parent order in the 'orders' table
      const [newOrder] = await trx('orders')
        .insert({
          customer_name: validatedOrder.customer_name,
          customer_contact: validatedOrder.customer_contact,
          status: 'draft',
          calculation_version: 1
        })
        .returning('*');

      // 5. Loop through order items, calculate costs and write snapshots
      for (const item of validatedOrder.items) {
        
        // A. Fetch the product template and its linked material properties in one single JOIN query
        const product = await trx('products as p')
          .join('materials as m', 'p.material_id', 'm.id')
          .where('p.id', item.product_id)
          .select([
            'p.*',
            'm.name as material_name',
            'm.price_per_kg as material_price_per_kg',
            'm.fail_rate as material_fail_rate',
            'm.default_margin as material_default_margin'
          ])
          .first();

        // Throw error if product template is not found. This automatically rolls back the transaction.
        if (!product) {
          throw new Error(`LỖI TOÀN VẸN: Không tìm thấy Sản phẩm mẫu có mã số ${item.product_id}`);
        }

        // B. Fetch fixed items (accessories/packaging) associated with the product template
        const fixedItems = await trx('product_fixed_items as pfi')
          .join('fixed_items as fi', 'pfi.fixed_item_id', 'fi.id')
          .where('pfi.product_id', product.id)
          .select('fi.cost', 'pfi.quantity');

        // C. Invoke the Calculation Engine using the correct nested CalculateRequestInput shape
        const calculatedResult = calculateProductCosts({
          weight_gram: Number(product.weight_gram),
          print_time_seconds: product.print_time_seconds,
          labor_time_minutes: product.labor_time_minutes,
          batch_quantity: product.batch_quantity,
          margin_override: product.margin_override !== null && product.margin_override !== undefined 
            ? Number(product.margin_override) 
            : undefined,
          material: {
            price_per_kg: Number(product.material_price_per_kg),
            fail_rate: Number(product.material_fail_rate),
            default_margin: Number(product.material_default_margin)
          },
          operational_config: {
            machine_depreciation_per_hour: Number(machineDepr),
            labor_cost_per_minute: Number(laborCost)
          },
          fixed_items: fixedItems.map(f => ({ cost: Number(f.cost), quantity: f.quantity }))
        });

        // D. Calculate final unit price (apply price override with rounding to meet check constraints)
        let finalUnitPrice = calculatedResult.final_suggested_price;
        if (item.price_override !== undefined && item.price_override !== null) {
          finalUnitPrice = roundTo100(Big(item.price_override));
        }

        // E. Freeze item details into the 'order_items' ledger (using Unit-Level Snapshots for analytics parity)
        const unitWeightGram = Number(Math.max(0.01, Number(product.weight_gram)));
        const unitPrintSeconds = Math.max(1, Math.round(product.print_time_seconds));
        const unitLaborMinutes = Math.max(0, Math.round(product.labor_time_minutes));

        await trx('order_items').insert({
          order_id: newOrder.id,
          product_id: product.id,
          
          // Metadata Snapshot
          snapshot_product_name: product.name,
          snapshot_material_name: product.material_name,
          snapshot_weight_gram: unitWeightGram,
          snapshot_print_time_seconds: unitPrintSeconds,
          snapshot_labor_time_minutes: unitLaborMinutes,
          snapshot_fail_rate: product.material_fail_rate,
          snapshot_margin: calculatedResult.applied_margin,
          snapshot_batch_quantity: product.batch_quantity,
          item_calculation_version: 1,

          // Component raw costs (using engine's snake_case properties - already divided to unit level in engine)
          raw_material_cost: calculatedResult.raw_material_cost,
          raw_machine_cost: calculatedResult.raw_machine_cost,
          raw_labor_cost: calculatedResult.raw_labor_cost,
          raw_fixed_items_cost: calculatedResult.raw_fixed_items_cost,
          
          // Quantities and pricing
          final_unit_price: finalUnitPrice,
          quantity: item.quantity
        });
      }

      // 6. Commit the entire transaction
      await trx.commit();
      
      res.status(201).json({ 
        success: true, 
        data: { 
          order_id: newOrder.id, 
          customer_name: newOrder.customer_name,
          customer_contact: newOrder.customer_contact,
          status: newOrder.status,
          calculation_version: newOrder.calculation_version
        } 
      });

    } catch (error) {
      // Rollback transaction to protect database state integrity
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// [PATCH] Update order status (State Machine validation + Ironclad Lock support)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // 1. Validate payload
    const { status: newStatus, is_loss_counted } = patchOrderSchema.parse(req.body);

    // 2. Fetch current order state
    const currentOrder = await db('orders').where({ id }).first();
    if (!currentOrder) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng cần cập nhật.' });
    }

    // 3. Enforce Ironclad Lock — reject mutations on permanently locked orders
    if (currentOrder.status === 'cancelled' && currentOrder.is_loss_counted === true) {
      return res.status(409).json({
        success: false,
        message: 'Vi phạm luật vận hành xưởng: Đơn hàng này đã bị khóa cứng do hủy và tính hao hụt xưởng. Không thể chỉnh sửa!',
      });
    }

    // 4. Enforce State Machine transitions
    const validNextStates = VALID_NEXT_STATES[currentOrder.status] ?? [];
    if (!validNextStates.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Không thể chuyển đơn hàng từ trạng thái "${currentOrder.status}" sang "${newStatus}".`,
      });
    }

    // 5. Build update payload
    const updatePayload: Record<string, unknown> = { status: newStatus };
    if (newStatus === 'cancelled') {
      updatePayload.is_loss_counted = is_loss_counted ?? false;
    }

    // 6. Perform update (DB Trigger enforce_order_lock is the ultimate guard)
    const [updatedOrder] = await db('orders')
      .where({ id })
      .update(updatePayload)
      .returning(['id', 'customer_name', 'customer_contact', 'status', 'is_loss_counted', 'calculation_version', 'created_at', 'updated_at']);

    res.json({ success: true, data: updatedOrder });
  } catch (error) {
    next(error);
  }
});

export { router as ordersRouter };
