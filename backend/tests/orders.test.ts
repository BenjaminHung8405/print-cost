import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/core/database/client';

describe('Orders API Integration Tests', () => {
  let testMaterialId: number;
  let testProductId: number;
  let testProductZeroMarginId: number;
  let testFixedItemId: number;

  beforeAll(async () => {
    // 1. Clean up stale test records to prevent conflicts
    await db('order_items').del();
    await db('orders').del();
    await db('product_fixed_items').del();
    await db('products').del();
    await db('materials').del();
    await db('fixed_items').del();
    await db('operational_configs').del();

    // 2. Seed global operational configs
    await db('operational_configs').insert([
      { key: 'machine_depreciation_per_hour', value: 5000.0000, description: 'Test depreciation' },
      { key: 'labor_cost_per_minute', value: 500.0000, description: 'Test labor' }
    ]);

    // 3. Seed a test material
    const [material] = await db('materials').insert({
      name: 'TEST-PLA',
      price_per_kg: 250000.00,
      fail_rate: 1.10,
      default_margin: 0.40
    }).returning('*');
    testMaterialId = material.id;

    // 4. Seed a standard test product (TEST-KEYCAP)
    const [product] = await db('products').insert({
      name: 'TEST-KEYCAP',
      material_id: testMaterialId,
      weight_gram: 16.88,
      print_time_seconds: 5700,
      labor_time_minutes: 0,
      margin_override: null
    }).returning('*');
    testProductId = product.id;

    // 5. Seed a test product with a 0% margin override
    const [productZeroMargin] = await db('products').insert({
      name: 'TEST-ZERO-MARGIN',
      material_id: testMaterialId,
      weight_gram: 16.88,
      print_time_seconds: 5700,
      labor_time_minutes: 0,
      margin_override: 0.00
    }).returning('*');
    testProductZeroMarginId = productZeroMargin.id;

    // 6. Seed a test fixed item
    const [fixedItem] = await db('fixed_items').insert({
      name: 'TEST-STICKER',
      item_type: 'packaging',
      cost: 2400.33
    }).returning('*');
    testFixedItemId = fixedItem.id;

    // 7. Associate the fixed item with standard product
    await db('product_fixed_items').insert({
      product_id: testProductId,
      fixed_item_id: testFixedItemId,
      quantity: 1
    });
  });

  afterAll(async () => {
    // Clean up all seeded data after test execution completes
    await db('order_items').del();
    await db('orders').del();
    await db('product_fixed_items').del();
    await db('products').del();
    await db('materials').del();
    await db('fixed_items').del();
    await db('operational_configs').del();
    // Close database connection pool to let process exit cleanly
    await db.destroy();
  });

  it('should create an order successfully and freeze snapshot parameters', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Nguyen Van A',
        customer_contact: '0901234567',
        items: [
          {
            product_id: testProductId,
            quantity: 2
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.order_id).toBeDefined();
    expect(res.body.data.customer_name).toBe('Nguyen Van A');

    // Query database to inspect order_items snapshot details
    const orderId = res.body.data.order_id;
    const items = await db('order_items').where({ order_id: orderId });
    expect(items.length).toBe(1);

    const snapshot = items[0];
    expect(snapshot.snapshot_product_name).toBe('TEST-KEYCAP');
    expect(snapshot.snapshot_material_name).toBe('TEST-PLA');
    expect(Number(snapshot.snapshot_weight_gram)).toBe(16.88);
    expect(snapshot.snapshot_print_time_seconds).toBe(5700);
    expect(snapshot.snapshot_labor_time_minutes).toBe(0);
    expect(Number(snapshot.snapshot_fail_rate)).toBe(1.10);
    expect(Number(snapshot.snapshot_margin)).toBe(0.40);

    // Validate calculations match expected:
    // raw_material_cost: 16.88 * (250000 / 1000) * 1.10 = 4642
    expect(Number(snapshot.raw_material_cost)).toBe(4642);
    // raw_machine_cost: (5700 / 3600) * 5000 = 7916.6667
    expect(Number(snapshot.raw_machine_cost)).toBe(7916.6667);
    // raw_labor_cost: 0 * 500 = 0
    expect(Number(snapshot.raw_labor_cost)).toBe(0);
    // raw_fixed_items_cost: 2400.33
    expect(Number(snapshot.raw_fixed_items_cost)).toBe(2400.33);
    // raw_unit_cogs (generated): 4642 + 7916.6667 + 0 + 2400.33 = 14958.9967
    expect(Number(snapshot.raw_unit_cogs)).toBe(14958.9967);

    // final_unit_price: roundTo100(14958.9967 / 0.60) = roundTo100(24931.66) = 24900
    expect(Number(snapshot.final_unit_price)).toBe(24900);
    expect(snapshot.quantity).toBe(2);
    // total_item_price (generated): 24900 * 2 = 49800
    expect(Number(snapshot.total_item_price)).toBe(49800);
  });

  it('should accept custom price_override and round it correctly to 100 VND', async () => {
    // 1. Price override that rounds down (25549 -> 25500)
    const resDown = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Khach Hang B',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
            price_override: 25549
          }
        ]
      });

    expect(resDown.status).toBe(201);
    const orderIdDown = resDown.body.data.order_id;
    const [itemDown] = await db('order_items').where({ order_id: orderIdDown });
    expect(Number(itemDown.final_unit_price)).toBe(25500);

    // 2. Price override that rounds up (25550 -> 25600)
    const resUp = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Khach Hang C',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
            price_override: 25550
          }
        ]
      });

    expect(resUp.status).toBe(201);
    const orderIdUp = resUp.body.data.order_id;
    const [itemUp] = await db('order_items').where({ order_id: orderIdUp });
    expect(Number(itemUp.final_unit_price)).toBe(25600);
  });

  it('should handle product with 0% margin override correctly', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Khach VIP - 0% Margin',
        items: [
          {
            product_id: testProductZeroMarginId,
            quantity: 1
          }
        ]
      });

    expect(res.status).toBe(201);
    const orderId = res.body.data.order_id;
    const [item] = await db('order_items').where({ order_id: orderId });
    
    // Check margin is exactly 0.00
    expect(Number(item.snapshot_margin)).toBe(0.00);

    // COGS = 4642 + 7916.6667 + 0 + 0 (No fixed items linked to testProductZeroMarginId) = 12558.6667
    // Suggested = 12558.6667 / (1 - 0) = 12558.6667 -> roundTo100 = 12600
    expect(Number(item.final_unit_price)).toBe(12600);
  });

  it('should reject order creation if customer_name is missing or invalid', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_contact: '0901111222',
        items: [
          {
            product_id: testProductId,
            quantity: 1
          }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject order creation if items is empty', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Test Empty Items',
        items: []
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should roll back completely (atomic transaction) if any product does not exist', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Khach Hang X',
        items: [
          {
            product_id: testProductId,
            quantity: 1
          },
          {
            product_id: 999999, // Non-existent product ID
            quantity: 1
          }
        ]
      });

    expect(res.status).toBe(500);

    // Verify that NO order was written in 'orders' for customer 'Khach Hang X'
    const orders = await db('orders').where({ customer_name: 'Khach Hang X' });
    expect(orders.length).toBe(0);
  });
});
