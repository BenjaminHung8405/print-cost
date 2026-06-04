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
