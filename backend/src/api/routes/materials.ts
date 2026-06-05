import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../core/database/client';
import { createMaterialSchema } from '../../core/calculation/schemas';

const router = Router();

// [GET] List all materials
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db('materials').select('*').orderBy('id', 'asc');
    res.json({ success: true, data });
  } catch (error) { 
    next(error); 
  }
});

// [POST] Create new material
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = createMaterialSchema.parse(req.body);
    
    const [newMaterial] = await db('materials')
      .insert({
        name: validatedData.name,
        price_per_kg: validatedData.price_per_kg,
        fail_rate: validatedData.fail_rate,
        default_margin: validatedData.default_margin
      })
      .returning('*');

    res.status(201).json({ success: true, data: newMaterial });
  } catch (error) { 
    next(error); 
  }
});

// [PUT] Update material details (let DB Trigger update updated_at)
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const validatedData = createMaterialSchema.parse(req.body);

    const updatedRows = await db('materials')
      .where({ id })
      .update({
        name: validatedData.name,
        price_per_kg: validatedData.price_per_kg,
        fail_rate: validatedData.fail_rate,
        default_margin: validatedData.default_margin
      })
      .returning('*');

    if (updatedRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy loại nhựa cần sửa.' });
    }

    res.json({ success: true, data: updatedRows[0] });
  } catch (error) { 
    next(error); 
  }
});

// [DELETE] Delete material
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const deletedCount = await db('materials').where({ id }).del();

    if (deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy loại nhựa cần xóa.' });
    }

    res.status(200).json({ success: true, message: 'Đã xóa loại nhựa thành công.' });
  } catch (error) { 
    next(error); 
  }
});

export { router as materialsRouter };
