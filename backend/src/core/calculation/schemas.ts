import { z } from 'zod';

export const materialSchema = z.object({
  price_per_kg: z.coerce.number().positive('Giá nhựa phải lớn hơn 0'),
  fail_rate: z.coerce.number().min(1.00, 'Hệ số hao hụt (fail rate) phải >= 1.00'),
  default_margin: z.coerce.number().min(0.00).max(1.00, 'Biên lợi nhuận mặc định phải từ 0.00 đến 1.00'),
});

export const operationalConfigSchema = z.object({
  machine_depreciation_per_hour: z.coerce.number().nonnegative('Khấu hao máy phải >= 0'),
  labor_cost_per_minute: z.coerce.number().nonnegative('Công thợ phải >= 0'),
});

export const fixedItemSchema = z.object({
  cost: z.coerce.number().nonnegative('Giá vật tư phải >= 0'),
  quantity: z.coerce.number().int('Số lượng phải là số nguyên').positive('Số lượng phải > 0'),
});

export const calculateRequestSchema = z.object({
  material: materialSchema,
  operational_config: operationalConfigSchema,
  weight_gram: z.coerce.number().positive('Khối lượng sản phẩm phải > 0'),
  print_time_seconds: z.coerce.number().int('Thời gian in phải là số nguyên giây').positive('Thời gian in phải > 0'),
  labor_time_minutes: z.coerce.number().int('Thời gian công thợ phải là số nguyên phút').nonnegative('Thời gian công thợ phải >= 0'),
  margin_override: z.coerce.number().min(0.00).max(1.00, 'Ghi đè biên lợi nhuận phải từ 0.00 đến 1.00').nullable().optional(),
  fixed_items: z.array(fixedItemSchema).default([]),
});

export type CalculateRequestInput = z.infer<typeof calculateRequestSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type OperationalConfigInput = z.infer<typeof operationalConfigSchema>;
export type FixedItemInput = z.infer<typeof fixedItemSchema>;

// Helper to prevent the Zod coercion trap (Preprocessing empty inputs to null)
export const safeCoerceNumber = z.preprocess((val) => {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string' && val.trim() === '') return null;
  return Number(val);
}, z.number().nullable());

// Validation schema for creating/updating materials
export const createMaterialSchema = z.object({
  name: z.string().trim().min(1, 'Tên loại nhựa không được để trống').max(50),
  price_per_kg: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Giá nhựa phải là một số' })
     .positive('Giá nhựa phải lớn hơn 0')
  ),
  fail_rate: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Hệ số hao hụt phải là một số' })
     .min(1.00, 'Hệ số hao hụt phải >= 1.00')
  ),
  default_margin: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Biên lợi nhuận phải là một số' })
     .min(0.00, 'Biên lợi nhuận phải >= 0.00')
     .max(1.00, 'Biên lợi nhuận phải <= 1.00')
  ),
});

// Validation schema for creating/updating fixed items
export const createFixedItemSchema = z.object({
  name: z.string().trim().min(1, 'Tên vật tư không được để trống').max(100),
  item_type: z.enum(['accessory', 'packaging'], {
    errorMap: () => ({ message: 'Loại vật tư phải là accessory hoặc packaging' })
  }),
  cost: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Đơn giá vật tư phải là một số' })
     .nonnegative('Đơn giá vật tư phải >= 0')
  ),
});

// Validation schema for creating/updating product templates
export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Tên sản phẩm không được để trống').max(255),
  material_id: z.number({ invalid_type_error: 'Mã loại nhựa phải là số nguyên' })
   .int('Mã loại nhựa phải là số nguyên')
   .positive('Mã loại nhựa không hợp lệ'),
  weight_gram: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Khối lượng phải là một số' })
     .positive('Khối lượng sản phẩm phải lớn hơn 0')
  ),
  print_time_seconds: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Thời gian in phải là một số nguyên giây' })
     .int('Thời gian in phải là số nguyên giây')
     .positive('Thời gian in phải lớn hơn 0 giây')
  ),
  labor_time_minutes: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Thời gian công thợ phải là một số nguyên phút' })
     .int('Thời gian công thợ phải là số nguyên phút')
     .nonnegative('Thời gian công thợ phải >= 0')
  ),
  margin_override: safeCoerceNumber.pipe(
    z.number({ invalid_type_error: 'Biên lợi nhuận ghi đè phải là một số' })
     .min(0.00, 'Biên lợi nhuận phải >= 0.00')
     .max(1.00, 'Biên lợi nhuận phải <= 1.00')
     .optional()
     .nullable()
  ),
  fixed_items: z.array(
    z.object({
      fixed_item_id: z.number({ invalid_type_error: 'Mã vật tư phải là số nguyên' })
       .int('Mã vật tư phải là số nguyên')
       .positive('Mã vật tư không hợp lệ'),
      quantity: z.number({ invalid_type_error: 'Số lượng vật tư phải là số nguyên' })
       .int('Số lượng vật tư phải là số nguyên')
       .positive('Số lượng vật tư phải >= 1')
    })
  ).optional().default([])
});

