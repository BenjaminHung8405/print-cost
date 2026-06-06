import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';
import { createProductSchema } from '../../core/calculation/schemas';

const router = Router();

// [GET] List all products (single query optimized aggregated group read)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db('products as p')
      .join('materials as m', 'p.material_id', 'm.id')
      .leftJoin('product_fixed_items as pfi', 'p.id', 'pfi.product_id')
      .leftJoin('fixed_items as fi', 'pfi.fixed_item_id', 'fi.id')
      .select([
        'p.*',
        'm.name as material_name',
        db.raw(`
          COALESCE(
            json_agg(
              json_build_object('id', fi.id, 'name', fi.name, 'cost', fi.cost, 'quantity', pfi.quantity)
            ) FILTER (WHERE fi.id IS NOT NULL), '[]'
          ) as fixed_items
        `)
      ])
      .groupBy('p.id', 'm.name')
      .orderBy('p.id', 'desc');

    res.json({ success: true, data });
  } catch (error) { 
    next(error); 
  }
});

// [GET] Get specific product by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await db('products as p')
      .join('materials as m', 'p.material_id', 'm.id')
      .leftJoin('product_fixed_items as pfi', 'p.id', 'pfi.product_id')
      .leftJoin('fixed_items as fi', 'pfi.fixed_item_id', 'fi.id')
      .select([
        'p.*',
        'm.name as material_name',
        db.raw(`
          COALESCE(
            json_agg(
              json_build_object('id', fi.id, 'name', fi.name, 'cost', fi.cost, 'quantity', pfi.quantity)
            ) FILTER (WHERE fi.id IS NOT NULL), '[]'
          ) as fixed_items
        `)
      ])
      .where('p.id', id)
      .groupBy('p.id', 'm.name');

    if (data.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm mẫu.' });
    }

    res.json({ success: true, data: data[0] });
  } catch (error) { 
    next(error); 
  }
});

// [POST] Create new product (Safe transactional write)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Validate data BEFORE opening a database transaction
    const validatedData = createProductSchema.parse(req.body);

    // 2. Open transaction only when payload has passed Zod check
    const trx = await db.transaction();
    try {
      const [newProduct] = await trx('products')
        .insert({
          name: validatedData.name,
          material_id: validatedData.material_id,
          weight_gram: validatedData.weight_gram,
          print_time_seconds: validatedData.print_time_seconds,
          labor_time_minutes: validatedData.labor_time_minutes,
          batch_quantity: validatedData.batch_quantity,
          margin_override: validatedData.margin_override
        })
        .returning('*');

      // Insert accessory/packaging relationships (Many-to-Many)
      if (validatedData.fixed_items && validatedData.fixed_items.length > 0) {
        const itemsToInsert = validatedData.fixed_items.map(item => ({
          product_id: newProduct.id,
          fixed_item_id: item.fixed_item_id,
          quantity: item.quantity
        }));
        await trx('product_fixed_items').insert(itemsToInsert);
      }

      await trx.commit();
      res.status(201).json({ success: true, data: newProduct });
    } catch (dbError) {
      await trx.rollback();
      throw dbError; // Forward DB constraint violations to centralized error handler
    }
  } catch (error) {
    next(error);
  }
});

// [PUT] Update existing product details (Safe transactional update)
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // 1. Validate data BEFORE opening a transaction
    const validatedData = createProductSchema.parse(req.body);

    // 2. Open transaction
    const trx = await db.transaction();
    try {
      const updatedRows = await trx('products')
        .where({ id })
        .update({
          name: validatedData.name,
          material_id: validatedData.material_id,
          weight_gram: validatedData.weight_gram,
          print_time_seconds: validatedData.print_time_seconds,
          labor_time_minutes: validatedData.labor_time_minutes,
          batch_quantity: validatedData.batch_quantity,
          margin_override: validatedData.margin_override
        })
        .returning('*');

      if (updatedRows.length === 0) {
        await trx.rollback();
        return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm cần sửa.' });
      }

      // Delete stale accessory relationships
      await trx('product_fixed_items').where({ product_id: id }).del();

      // Insert fresh relationships
      if (validatedData.fixed_items && validatedData.fixed_items.length > 0) {
        const itemsToInsert = validatedData.fixed_items.map(item => ({
          product_id: Number(id),
          fixed_item_id: item.fixed_item_id,
          quantity: item.quantity
        }));
        await trx('product_fixed_items').insert(itemsToInsert);
      }

      await trx.commit();

      // Retrieve full product data with aggregations for response
      const [updatedProduct] = await db('products as p')
        .join('materials as m', 'p.material_id', 'm.id')
        .leftJoin('product_fixed_items as pfi', 'p.id', 'pfi.product_id')
        .leftJoin('fixed_items as fi', 'pfi.fixed_item_id', 'fi.id')
        .select([
          'p.*',
          'm.name as material_name',
          db.raw(`
            COALESCE(
              json_agg(
                json_build_object('id', fi.id, 'name', fi.name, 'cost', fi.cost, 'quantity', pfi.quantity)
              ) FILTER (WHERE fi.id IS NOT NULL), '[]'
            ) as fixed_items
          `)
        ])
        .where('p.id', id)
        .groupBy('p.id', 'm.name');

      res.json({ success: true, data: updatedProduct });
    } catch (dbError) {
      await trx.rollback();
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
});

// [DELETE] Delete product template
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // ON DELETE CASCADE automatically deletes associated rows in product_fixed_items
    const deletedCount = await db('products').where({ id }).del();

    if (deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm mẫu cần xóa.' });
    }

    res.status(200).json({ success: true, message: 'Đã xóa sản phẩm mẫu thành công.' });
  } catch (error) {
    next(error);
  }
});

export { router as productsRouter };
