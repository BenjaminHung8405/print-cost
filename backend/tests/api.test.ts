import { describe, it, expect } from 'vitest';
import { createMaterialSchema, createFixedItemSchema, createProductSchema } from '../src/core/calculation/schemas';

describe('Validation Schemas & Coercion', () => {
  describe('createMaterialSchema', () => {
    it('should validate standard correct inputs', () => {
      const result = createMaterialSchema.safeParse({
        name: 'PLA',
        price_per_kg: 250000,
        fail_rate: 1.10,
        default_margin: 0.40
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('PLA');
        expect(result.data.price_per_kg).toBe(250000);
      }
    });

    it('should coerce string numbers', () => {
      const result = createMaterialSchema.safeParse({
        name: 'PETG',
        price_per_kg: '203000',
        fail_rate: '1.05',
        default_margin: '0.35'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.price_per_kg).toBe(203000);
        expect(result.data.fail_rate).toBe(1.05);
      }
    });

    it('should fail on empty string, whitespace or null for required fields', () => {
      const resultEmptyStr = createMaterialSchema.safeParse({
        name: 'PLA',
        price_per_kg: '',
        fail_rate: 1.10,
        default_margin: 0.40
      });
      expect(resultEmptyStr.success).toBe(false);

      const resultNull = createMaterialSchema.safeParse({
        name: 'PLA',
        price_per_kg: null,
        fail_rate: 1.10,
        default_margin: 0.40
      });
      expect(resultNull.success).toBe(false);

      const resultWhitespace = createMaterialSchema.safeParse({
        name: 'PLA',
        price_per_kg: '   ',
        fail_rate: 1.10,
        default_margin: 0.40
      });
      expect(resultWhitespace.success).toBe(false);
    });

    it('should reject invalid values (price <= 0, fail_rate < 1.0, margin outside 0-1)', () => {
      expect(createMaterialSchema.safeParse({
        name: 'PLA', price_per_kg: 0, fail_rate: 1.10, default_margin: 0.40
      }).success).toBe(false);

      expect(createMaterialSchema.safeParse({
        name: 'PLA', price_per_kg: 250000, fail_rate: 0.99, default_margin: 0.40
      }).success).toBe(false);

      expect(createMaterialSchema.safeParse({
        name: 'PLA', price_per_kg: 250000, fail_rate: 1.10, default_margin: -0.01
      }).success).toBe(false);

      expect(createMaterialSchema.safeParse({
        name: 'PLA', price_per_kg: 250000, fail_rate: 1.10, default_margin: 1.01
      }).success).toBe(false);
    });
  });

  describe('createFixedItemSchema', () => {
    it('should validate and coerce fixed item properties', () => {
      const result = createFixedItemSchema.safeParse({
        name: 'Hộp carton',
        item_type: 'packaging',
        cost: '850.50'
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cost).toBe(850.5);
        expect(result.data.item_type).toBe('packaging');
      }
    });

    it('should fail on invalid item_type', () => {
      const result = createFixedItemSchema.safeParse({
        name: 'Hộp carton',
        item_type: 'box',
        cost: 850
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createProductSchema', () => {
    it('should validate a valid product request with fixed items', () => {
      const result = createProductSchema.safeParse({
        name: 'Uzi Jesus',
        material_id: 1,
        weight_gram: 250.5,
        print_time_seconds: 36000,
        labor_time_minutes: 30,
        margin_override: 0.50,
        fixed_items: [
          { fixed_item_id: 2, quantity: 1 },
          { fixed_item_id: 3, quantity: 2 }
        ]
      });
      expect(result.success).toBe(true);
    });

    it('should accept null or empty string for margin_override and output null', () => {
      const resultNull = createProductSchema.safeParse({
        name: 'Uzi Jesus',
        material_id: 1,
        weight_gram: 250.5,
        print_time_seconds: 36000,
        labor_time_minutes: 30,
        margin_override: null
      });
      expect(resultNull.success).toBe(true);
      if (resultNull.success) {
        expect(resultNull.data.margin_override).toBe(null);
      }

      const resultEmpty = createProductSchema.safeParse({
        name: 'Uzi Jesus',
        material_id: 1,
        weight_gram: 250.5,
        print_time_seconds: 36000,
        labor_time_minutes: 30,
        margin_override: '   '
      });
      expect(resultEmpty.success).toBe(true);
      if (resultEmpty.success) {
        expect(resultEmpty.data.margin_override).toBe(null);
      }
    });

    it('should fail on required fields left blank or invalid types', () => {
      const result = createProductSchema.safeParse({
        name: 'Uzi Jesus',
        material_id: 'abc', // invalid id
        weight_gram: '',
        print_time_seconds: 36000,
        labor_time_minutes: 30
      });
      expect(result.success).toBe(false);
    });
  });
});
