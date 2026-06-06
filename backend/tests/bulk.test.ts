import { describe, it, expect } from 'vitest';
import { calculateOrderTotals, type OrderItem } from '../../frontend/web/src/lib/pricing';
import type { ApiProduct, ApiOperationalConfigs } from '../../frontend/web/src/core/api/client';
import type { MaterialConfig } from '../../frontend/web/src/lib/pricing';

describe('Wholesale/Bulk Margin Calculation Engine', () => {
  // Mock products, materials, operational configs
  const products: ApiProduct[] = [
    {
      id: 1,
      name: 'Standard Keycap (PLA)',
      material_id: 1,
      material_name: 'PLA Plast',
      weight_gram: 10,
      print_time_seconds: 3600, // 1h
      labor_time_minutes: 0,
      batch_quantity: 1,
      margin_override: null,
      fixed_items: []
    },
    {
      id: 2,
      name: 'Advanced Gear (TPU)',
      material_id: 2,
      material_name: 'TPU Plast',
      weight_gram: 20,
      print_time_seconds: 7200, // 2h
      labor_time_minutes: 10,
      batch_quantity: 1,
      margin_override: 0.50, // Product specific override (Safety = 50%)
      fixed_items: []
    }
  ];

  const materialMap: Record<number, MaterialConfig> = {
    1: {
      price_per_kg: 200000, // 200đ per gram
      fail_rate: 1.10,
      default_margin: 0.30 // Safety = 30%
    },
    2: {
      price_per_kg: 400000, // 400đ per gram
      fail_rate: 1.15,
      default_margin: 0.40
    }
  };

  const configs: ApiOperationalConfigs = {
    machine_depreciation_per_hour: 5000,
    labor_cost_per_minute: 500
  };

  it('should fall back to default margins when no order margin override is set', () => {
    const items: OrderItem[] = [
      { id: 'item-1', productId: '1', quantity: 2 }
    ];

    const totals = calculateOrderTotals(items, products, materialMap, configs);

    expect(totals.is_bulk_pricing).toBe(false);
    expect(totals.items.length).toBe(1);
    
    const calculatedItem = totals.items[0];
    expect(calculatedItem.applied_margin).toBe(0.30); // Uses material default margin
    expect(calculatedItem.is_below_safety).toBe(false);
    
    // Product 1 Costs:
    // Material: 10g * 200đ/g * 1.10 = 2200đ
    // Machine: 1h * 5000đ = 5000đ
    // Labor: 0m = 0đ
    // COGS = 7200đ
    // Retail Price: 7200 / (1 - 0.3) = 10285.71đ -> roundTo100 = 10300đ
    expect(calculatedItem.final_unit_price).toBe(10300);
    expect(calculatedItem.total_item_price).toBe(20600); // 10300 * 2
    expect(totals.totalPrice).toBe(20600);
  });

  it('should apply order margin override to all items without explicit price override', () => {
    const items: OrderItem[] = [
      { id: 'item-1', productId: '1', quantity: 2 },
      { id: 'item-2', productId: '2', quantity: 1 }
    ];

    // Apply wholesale margin of 15%
    const totals = calculateOrderTotals(items, products, materialMap, configs, 0.15);

    expect(totals.is_bulk_pricing).toBe(true);
    expect(totals.items.length).toBe(2);

    const item1 = totals.items.find(i => i.id === 'item-1')!;
    const item2 = totals.items.find(i => i.id === 'item-2')!;

    // Item 1: COGS = 7200đ. Marg = 15%.
    // Price = 7200 / 0.85 = 8470.58đ -> roundTo100 = 8500đ
    expect(item1.applied_margin).toBe(0.15);
    expect(item1.final_unit_price).toBe(8500);
    expect(item1.total_item_price).toBe(17000);

    // Item 1 Safety check: Applied margin 15% vs Default margin 30% -> Should warn!
    expect(item1.is_below_safety).toBe(true);

    // Item 2 Costs:
    // Material: 20g * 400đ/g * 1.15 = 9200đ
    // Machine: 2h * 5000đ = 10000đ
    // Labor: 10m * 500đ = 5000đ
    // COGS = 24200đ. Marg = 15%.
    // Price = 24200 / 0.85 = 28470.59đ -> roundTo100 = 28500đ
    expect(item2.applied_margin).toBe(0.15);
    expect(item2.final_unit_price).toBe(28500);

    // Item 2 Safety check: Applied margin 15% vs Product override margin 50% -> Should warn!
    expect(item2.is_below_safety).toBe(true);

    // Total price is sum of rounded items: 17000 + 28500 = 45500đ (NO DRIFT)
    expect(totals.totalPrice).toBe(45500);
  });

  it('should respect manual item-level price overrides even with bulk margin override', () => {
    const items: OrderItem[] = [
      { id: 'item-1', productId: '1', quantity: 1, overridePrice: 9000 },
      { id: 'item-2', productId: '2', quantity: 1 }
    ];

    // Apply wholesale margin of 20%
    const totals = calculateOrderTotals(items, products, materialMap, configs, 0.20);

    const item1 = totals.items.find(i => i.id === 'item-1')!;
    const item2 = totals.items.find(i => i.id === 'item-2')!;

    // Item 1 price override is 9000
    expect(item1.final_unit_price).toBe(9000);

    // Item 2 uses wholesale margin of 20%: 24200 / 0.80 = 30250đ -> roundTo100 = 30300đ
    expect(item2.final_unit_price).toBe(30300);

    expect(totals.totalPrice).toBe(39300); // 9000 + 30300
  });

  it('should prevent warnings when applied margin is greater than or equal to safety margin', () => {
    const items: OrderItem[] = [
      { id: 'item-1', productId: '1', quantity: 1 }
    ];

    // Apply high margin of 40% (Safety is 30%)
    const totals = calculateOrderTotals(items, products, materialMap, configs, 0.40);
    const item1 = totals.items[0];

    expect(item1.applied_margin).toBe(0.40);
    expect(item1.is_below_safety).toBe(false);
  });
});
