import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';
import { createFixedItemSchema } from '../../core/calculation/schemas';

const router = Router();

// [GET] List all fixed items
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db('fixed_items').select('*').orderBy('id', 'asc');
    res.json({ success: true, data });
  } catch (error) { 
    next(error); 
  }
});

// [POST] Create new fixed item
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createFixedItemSchema.parse(req.body);
    
    const [newItem] = await db('fixed_items')
      .insert({
        name: validatedData.name,
        item_type: validatedData.item_type,
        cost: validatedData.cost
      })
      .returning('*');

    res.status(201).json({ success: true, data: newItem });
  } catch (error) { 
    next(error); 
  }
});

// [PUT] Update fixed item details
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = createFixedItemSchema.parse(req.body);

    const updatedRows = await db('fixed_items')
      .where({ id })
      .update({
        name: validatedData.name,
        item_type: validatedData.item_type,
        cost: validatedData.cost
      })
      .returning('*');

    if (updatedRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vật tư phụ cần sửa.' });
    }

    res.json({ success: true, data: updatedRows[0] });
  } catch (error) { 
    next(error); 
  }
});

// [DELETE] Delete fixed item
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deletedCount = await db('fixed_items').where({ id }).del();

    if (deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vật tư phụ cần xóa.' });
    }

    res.status(200).json({ success: true, message: 'Đã xóa vật tư phụ thành công.' });
  } catch (error) { 
    next(error); 
  }
});

export { router as fixedItemsRouter };
