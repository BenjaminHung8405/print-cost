import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';
import { createOrderSchema } from '../../core/calculation/schemas';
import { calculateProductCosts, roundTo100 } from '../../core/calculation/engine';
import Big from 'big.js';

const router = Router();

// [POST] Create a new order with snapshots (Ironclad Transaction)
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

        // E. Freeze item details into the 'order_items' ledger
        await trx('order_items').insert({
          order_id: newOrder.id,
          product_id: product.id,
          
          // Metadata Snapshot
          snapshot_product_name: product.name,
          snapshot_material_name: product.material_name,
          snapshot_weight_gram: product.weight_gram,
          snapshot_print_time_seconds: product.print_time_seconds,
          snapshot_labor_time_minutes: product.labor_time_minutes,
          snapshot_fail_rate: product.material_fail_rate,
          snapshot_margin: calculatedResult.applied_margin,
          item_calculation_version: 1,

          // Component raw costs (using engine's snake_case properties)
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

export { router as ordersRouter };
