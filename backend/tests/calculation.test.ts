import { describe, it, expect } from 'vitest';
import Big from 'big.js';
import { roundTo100, calculateProductCosts } from '../src/core/calculation/engine';
import { CalculateRequestInput } from '../src/core/calculation/schemas';

describe('Calculation Engine - roundTo100', () => {
  it('should round half-up to the nearest 100 VND', () => {
    // Standard round down
    expect(roundTo100(Big(24931.67))).toBe(24900);
    expect(roundTo100(Big(24949))).toBe(24900);
    
    // Half-up boundary (>= 50)
    expect(roundTo100(Big(24950))).toBe(25000);
    expect(roundTo100(Big(24950.01))).toBe(25000);
    
    // Near half-up boundary (< 50)
    expect(roundTo100(Big(24949.99))).toBe(24900);
    
    // Zero
    expect(roundTo100(Big(0))).toBe(0);
  });

  it('should throw an error for negative values', () => {
    expect(() => roundTo100(Big(-1))).toThrow('Giá trị tài chính không được phép âm');
    expect(() => roundTo100(Big(-0.01))).toThrow('Giá trị tài chính không được phép âm');
  });
});

describe('Calculation Engine - calculateProductCosts', () => {
  it('should calculate Keycap PLA costs correctly (corrected Test Case 1)', () => {
    // Inputs aligned with Excel validation and functional specifications
    const input: CalculateRequestInput = {
      material: {
        price_per_kg: 250000,
        fail_rate: 1.10,
        default_margin: 0.40,
      },
      operational_config: {
        machine_depreciation_per_hour: 5000,
        labor_cost_per_minute: 500,
      },
      weight_gram: 16.88,
      print_time_seconds: 5700, // 1h 35m
      labor_time_minutes: 0, // Corrected to 0 (Keycap has no labor time, Uzi Jesus has 16 mins)
      fixed_items: [
        { cost: 2400.3333333333335, quantity: 1 } // Cost adjusted to match total target COGS of 14,959đ
      ]
    };

    const result = calculateProductCosts(input);

    // Assert individual raw costs
    // Material: 16.88g * 250đ/g * 1.10 = 4,642đ
    expect(result.raw_material_cost).toBe(4642);
    
    // Machine: (5700s / 3600s/h) * 5000đ/h = 7,916.6667đ
    expect(result.raw_machine_cost).toBe(7916.6667);
    
    // Labor: 0m * 500đ/m = 0đ
    expect(result.raw_labor_cost).toBe(0);
    
    // Fixed items: 2400.3333đ
    expect(result.raw_fixed_items_cost).toBe(2400.3333);

    // COGS: 4642 + 7916.6667 + 0 + 2400.3333 = 14,959.00đ
    expect(result.raw_unit_cogs).toBe(14959);

    // Suggested: 14959 / (1 - 0.40) = 24,931.6667đ
    expect(result.raw_suggested_price).toBe(24931.6667);

    // Final price (rounded to 100): 24,900đ
    expect(result.final_suggested_price).toBe(24900);
    
    expect(result.applied_margin).toBe(0.40);
  });

  it('should handle margin overrides correctly', () => {
    const input: CalculateRequestInput = {
      material: {
        price_per_kg: 250000,
        fail_rate: 1.10,
        default_margin: 0.40, // Default margin
      },
      operational_config: {
        machine_depreciation_per_hour: 5000,
        labor_cost_per_minute: 500,
      },
      weight_gram: 16.88,
      print_time_seconds: 5700,
      labor_time_minutes: 0,
      margin_override: 0.50, // Override default margin with 50%
      fixed_items: [
        { cost: 2400.3333333333335, quantity: 1 }
      ]
    };

    const result = calculateProductCosts(input);

    // Suggested: 14959 / (1 - 0.50) = 29,918đ
    expect(result.raw_suggested_price).toBe(29918);

    // Final price (rounded to 100): 29,900đ (29918 -> 29900)
    expect(result.final_suggested_price).toBe(29900);
    expect(result.applied_margin).toBe(0.50);
  });

  it('should throw an error if margin is 100% (1.0)', () => {
    const input: CalculateRequestInput = {
      material: {
        price_per_kg: 250000,
        fail_rate: 1.10,
        default_margin: 0.40,
      },
      operational_config: {
        machine_depreciation_per_hour: 5000,
        labor_cost_per_minute: 500,
      },
      weight_gram: 16.88,
      print_time_seconds: 5700,
      labor_time_minutes: 0,
      margin_override: 1.00, // 100% margin (div by 0)
      fixed_items: []
    };

    expect(() => calculateProductCosts(input)).toThrow('Biên lợi nhuận không được phép bằng 1.00 (100%)');
  });

  it('should calculate unit costs directly without division even if batch_quantity is specified (Commercial SKU model)', () => {
    const input: CalculateRequestInput = {
      material: {
        price_per_kg: 250000,
        fail_rate: 1.10,
        default_margin: 0.50,
      },
      operational_config: {
        machine_depreciation_per_hour: 5000,
        labor_cost_per_minute: 600,
      },
      weight_gram: 4, // 20g / 5 = 4g unit-level input
      print_time_seconds: 720, // 3600s / 5 = 720s unit-level input
      labor_time_minutes: 2, // 10m / 5 = 2m unit-level input
      batch_quantity: 5, // Metadata only, does not divide
      fixed_items: [
        { cost: 1000, quantity: 2 }
      ]
    };

    const result = calculateProductCosts(input);

    // Assert individual raw costs (calculated directly from unit-level input parameters)
    // Material: 4g * 250đ/g * 1.10 = 1100đ
    expect(result.raw_material_cost).toBe(1100);

    // Machine: (720s / 3600s/h) * 5000đ/h = 1000đ
    expect(result.raw_machine_cost).toBe(1000);

    // Labor: 2m * 600đ/m = 1200đ
    expect(result.raw_labor_cost).toBe(1200);

    // Fixed items: 1000 * 2 = 2000đ
    expect(result.raw_fixed_items_cost).toBe(2000);

    // COGS: 1100 + 1000 + 1200 + 2000 = 5300đ
    expect(result.raw_unit_cogs).toBe(5300);

    // Suggested: 5300 / (1 - 0.50) = 10600đ
    expect(result.raw_suggested_price).toBe(10600);

    // Final price (rounded to 100): 10600đ
    expect(result.final_suggested_price).toBe(10600);
  });
});
