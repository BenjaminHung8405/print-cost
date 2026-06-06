import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/core/database/client';

describe('Analytics API Integration Tests', () => {
  let testMaterialId: number;
  let testProductId: number;

  beforeAll(async () => {
    // 1. Clean up database records (using TRUNCATE to bypass locks)
    await db.raw('TRUNCATE TABLE order_items, orders, product_fixed_items, products, fixed_items, materials RESTART IDENTITY CASCADE');
    await db('operational_configs').del();

    // 2. Seed operational configs
    await db('operational_configs').insert([
      { key: 'machine_depreciation_per_hour', value: 5000.0000, description: 'Test depreciation' },
      { key: 'labor_cost_per_minute', value: 500.0000, description: 'Test labor' }
    ]);

    // 3. Seed material
    const [material] = await db('materials').insert({
      name: 'TEST-PETG',
      price_per_kg: 300000.00,
      fail_rate: 1.15,
      default_margin: 0.35
    }).returning('*');
    testMaterialId = material.id;

    // 4. Seed product
    // weight_gram: 20g, print_time: 1 hour (3600s), labor: 0 min
    // raw_material_cost: 20 * (300000 / 1000) * 1.15 = 6900
    // raw_machine_cost: (3600 / 3600) * 5000 = 5000
    // raw_labor_cost: 0
    // raw_unit_cogs: 6900 + 5000 = 11900
    // final_unit_price: roundTo100(11900 / 0.65) = roundTo100(18307.69) = 18300
    const [product] = await db('products').insert({
      name: 'TEST-BRACKET',
      material_id: testMaterialId,
      weight_gram: 20.00,
      print_time_seconds: 3600,
      labor_time_minutes: 0,
      margin_override: null
    }).returning('*');
    testProductId = product.id;

    // 5. Create 3 orders
    // Order A: completed, quantity 2. Revenue = 36600, COGS = 23800.
    const resA = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Khach Hang A',
        items: [{ product_id: testProductId, quantity: 2 }]
      });
    const orderIdA = resA.body.data.order_id;
    await request(app).patch(`/api/orders/${orderIdA}`).send({ status: 'printing' });
    await request(app).patch(`/api/orders/${orderIdA}`).send({ status: 'completed' });

    // Order B: cancelled with loss counted, quantity 1. Revenue = 0, COGS = 11900.
    const resB = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Khach Hang B',
        items: [{ product_id: testProductId, quantity: 1 }]
      });
    const orderIdB = resB.body.data.order_id;
    await request(app).patch(`/api/orders/${orderIdB}`).send({ status: 'cancelled', is_loss_counted: true });

    // Order C: cancelled without loss counted. Excluded from analytics.
    const resC = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Khach Hang C',
        items: [{ product_id: testProductId, quantity: 1 }]
      });
    const orderIdC = resC.body.data.order_id;
    await request(app).patch(`/api/orders/${orderIdC}`).send({ status: 'cancelled', is_loss_counted: false });
  });

  afterAll(async () => {
    // Clean up database records (using TRUNCATE to bypass locks)
    await db.raw('TRUNCATE TABLE order_items, orders, product_fixed_items, products, fixed_items, materials RESTART IDENTITY CASCADE');
    await db('operational_configs').del();
    await db.destroy();
  });

  it('should fetch financial summary correctly', async () => {
    const res = await request(app).get('/api/analytics/summary');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totals');
    expect(res.body.data).toHaveProperty('monthly');

    // Totals validation:
    // total_revenue: 36600 (from Order A)
    // total_cogs: 23800 (from Order A)
    // total_wasted_cogs: 11900 (from Order B)
    // total_profit: 36600 - 23800 - 11900 = 900
    const totals = res.body.data.totals;
    expect(totals.total_revenue).toBe(36600);
    expect(totals.total_cogs).toBe(23800);
    expect(totals.total_wasted_cogs).toBe(11900);
    expect(totals.total_profit).toBe(900);
    expect(totals.total_orders).toBe(3); // A, B, C are counted in total_orders

    // Monthly validation:
    const monthly = res.body.data.monthly;
    expect(monthly.length).toBeGreaterThan(0);
    const thisMonth = monthly[0];
    expect(thisMonth.revenue).toBe(36600);
    expect(thisMonth.cogs).toBe(23800);
    expect(thisMonth.wasted_cogs).toBe(11900);
    expect(thisMonth.profit).toBe(900);
  });

  it('should fetch material consumption correctly', async () => {
    const res = await request(app).get('/api/analytics/materials');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const materials = res.body.data;
    expect(materials.length).toBe(1);
    expect(materials[0].material_name).toBe('TEST-PETG');

    // Consumption:
    // Order A (completed, qty 2): 20g * 1.15 * 2 = 46g
    // Order B (cancelled with loss, qty 1): 20g * 1.15 * 1 = 23g
    // Total: 69g
    expect(materials[0].total_weight_consumed).toBe(69);
  });

  it('should fetch machine run hours and handle maintenance reset flow', async () => {
    // 1. Check current hours
    // Total print seconds:
    // Order A (qty 2): 3600 * 2 = 7200s
    // Order B (qty 1): 3600 * 1 = 3600s
    // Total: 10800 seconds = 3 hours.
    const res1 = await request(app).get('/api/analytics/machines');
    expect(res1.status).toBe(200);
    expect(res1.body.data.total_print_time_hours).toBe(3);
    expect(res1.body.data.reset_hours).toBe(0);
    expect(res1.body.data.hours_since_maintenance).toBe(3);
    expect(res1.body.data.needs_maintenance).toBe(false); // 3 < 100

    // 2. Perform maintenance reset
    const resReset = await request(app).post('/api/analytics/machines/reset');
    expect(resReset.status).toBe(200);
    expect(resReset.body.data.reset_hours).toBe(3);
    expect(resReset.body.data.hours_since_maintenance).toBe(0);

    // 3. Verify changes persist in machine stats endpoint
    const res2 = await request(app).get('/api/analytics/machines');
    expect(res2.status).toBe(200);
    expect(res2.body.data.total_print_time_hours).toBe(3);
    expect(res2.body.data.reset_hours).toBe(3);
    expect(res2.body.data.hours_since_maintenance).toBe(0);
    expect(res2.body.data.needs_maintenance).toBe(false);
  });
});
