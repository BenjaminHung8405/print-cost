import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/core/database/client';

describe('Orders API Integration Tests', () => {
  let testMaterialId: number;
  let testProductId: number;
  let testProductZeroMarginId: number;
  let testBatchProductId: number;
  let testFixedItemId: number;

  beforeAll(async () => {
    // 1. Clean up stale test records to prevent conflicts (using TRUNCATE to bypass locks)
    await db.raw('TRUNCATE TABLE order_items, orders, product_fixed_items, products, fixed_items, materials RESTART IDENTITY CASCADE');
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

    // 5b. Seed a batch test product (using unit-level parameters for Commercial SKU)
    const [batchProduct] = await db('products').insert({
      name: 'TEST-BATCH-PRODUCT',
      material_id: testMaterialId,
      weight_gram: 10.00, // 50 / 5 (unit weight)
      print_time_seconds: 3600, // 18000 / 5 (unit print seconds)
      labor_time_minutes: 5, // 25 / 5 (unit labor minutes)
      batch_quantity: 5,
      margin_override: null
    }).returning('*');
    testBatchProductId = batchProduct.id;

    // 6. Seed a test fixed item
    const [fixedItem] = await db('fixed_items').insert({
      name: 'TEST-STICKER',
      item_type: 'packaging',
      cost: 2400.33
    }).returning('*');
    testFixedItemId = fixedItem.id;

    // 7. Associate the fixed item with standard product and batch product
    await db('product_fixed_items').insert({
      product_id: testProductId,
      fixed_item_id: testFixedItemId,
      quantity: 1
    });

    await db('product_fixed_items').insert({
      product_id: testBatchProductId,
      fixed_item_id: testFixedItemId,
      quantity: 1
    });
  });

  afterAll(async () => {
    // Clean up all seeded data after test execution completes (using TRUNCATE to bypass locks)
    await db.raw('TRUNCATE TABLE order_items, orders, product_fixed_items, products, fixed_items, materials RESTART IDENTITY CASCADE');
    await db('operational_configs').del();
    // Close database connection pool to let process exit cleanly
    await db.destroy();
  });

  // ─── CREATE ────────────────────────────────────────────────────────────────

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

  it('should create an order with a batch product, allocate unit costs, and freeze snapshot_batch_quantity', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Nguyen Batch Test',
        customer_contact: '0901112222',
        items: [
          {
            product_id: testBatchProductId,
            quantity: 3
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const orderId = res.body.data.order_id;
    const items = await db('order_items').where({ order_id: orderId });
    expect(items.length).toBe(1);

    const snapshot = items[0];
    expect(snapshot.snapshot_product_name).toBe('TEST-BATCH-PRODUCT');
    expect(snapshot.snapshot_batch_quantity).toBe(5);

    // Unit-level snapshots:
    // snapshot_weight_gram: 50 / 5 = 10g
    expect(Number(snapshot.snapshot_weight_gram)).toBe(10);
    // snapshot_print_time_seconds: 18000 / 5 = 3600s
    expect(snapshot.snapshot_print_time_seconds).toBe(3600);
    // snapshot_labor_time_minutes: 25 / 5 = 5m
    expect(snapshot.snapshot_labor_time_minutes).toBe(5);

    // Unit costs (allocated by batch_quantity of 5):
    // Material: (50g * 250đ/g * 1.10) / 5 = 2750đ
    expect(Number(snapshot.raw_material_cost)).toBe(2750);
    // Machine: ((18000 / 3600) * 5000) / 5 = 5000đ
    expect(Number(snapshot.raw_machine_cost)).toBe(5000);
    // Labor: (25m * 500đ/m) / 5 = 2500đ
    expect(Number(snapshot.raw_labor_cost)).toBe(2500);
    // Fixed items: 2400.33đ
    expect(Number(snapshot.raw_fixed_items_cost)).toBe(2400.33);

    // COGS: 2750 + 5000 + 2500 + 2400.33 = 12650.33đ
    expect(Number(snapshot.raw_unit_cogs)).toBe(12650.33);

    // final_unit_price: roundTo100(12650.33 / 0.6) = roundTo100(21083.88) = 21100đ
    expect(Number(snapshot.final_unit_price)).toBe(21100);
    expect(snapshot.quantity).toBe(3);
    expect(Number(snapshot.total_item_price)).toBe(63300);
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

  it('should accept custom price_override and calculate snapshot_margin correctly based on COGS and override price', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Custom Margin Verification',
        items: [
          {
            product_id: testProductId,
            quantity: 1,
            price_override: 20000
          }
        ]
      });

    expect(res.status).toBe(201);
    const orderId = res.body.data.order_id;
    const [item] = await db('order_items').where({ order_id: orderId });
    expect(Number(item.final_unit_price)).toBe(20000);
    // COGS is 14958.9967. Price is 20000.
    // Margin = 1 - 14958.9967 / 20000 = 0.25205
    // PostgreSQL NUMERIC(5, 2) parses 0.25205 as 0.25 (25%)
    expect(Number(item.snapshot_margin)).toBe(0.25);
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

  // ─── LIST ──────────────────────────────────────────────────────────────────

  it('should list all orders with aggregated items', async () => {
    const res = await request(app).get('/api/orders');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);

    // At least the orders we created above should exist
    expect(res.body.data.length).toBeGreaterThan(0);

    const order = res.body.data[0];
    expect(order).toHaveProperty('id');
    expect(order).toHaveProperty('customer_name');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('items');
    expect(Array.isArray(order.items)).toBe(true);
    expect(order).toHaveProperty('total_final_invoice_price');
    expect(order).toHaveProperty('total_raw_cogs');
  });

  // ─── DETAIL ────────────────────────────────────────────────────────────────

  it('should return detailed order with items by ID', async () => {
    // Create an order to inspect
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Detail Test Customer',
        customer_contact: 'https://facebook.com/test',
        items: [{ product_id: testProductId, quantity: 3 }]
      });

    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.order_id;

    const res = await request(app).get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const order = res.body.data;
    expect(order.id).toBe(orderId);
    expect(order.customer_name).toBe('Detail Test Customer');
    expect(order.customer_contact).toBe('https://facebook.com/test');
    expect(Array.isArray(order.items)).toBe(true);
    expect(order.items.length).toBe(1);

    const item = order.items[0];
    expect(item.snapshot_product_name).toBe('TEST-KEYCAP');
    expect(item.quantity).toBe(3);
    expect(item).toHaveProperty('raw_material_cost');
    expect(item).toHaveProperty('raw_machine_cost');
    expect(item).toHaveProperty('raw_unit_cogs');
    expect(item).toHaveProperty('total_item_price');

    // Totals should be computable
    expect(order.total_final_invoice_price).toBeGreaterThan(0);
    expect(order.total_raw_cogs).toBeGreaterThan(0);
  });

  it('should return 404 for non-existent order ID', async () => {
    const res = await request(app).get('/api/orders/999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // ─── STATUS UPDATE (STATE MACHINE) ─────────────────────────────────────────

  it('should update order status following valid state transitions', async () => {
    // Create a fresh draft order
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'State Machine Test',
        items: [{ product_id: testProductId, quantity: 1 }]
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.order_id;

    // draft -> printing
    const res1 = await request(app)
      .patch(`/api/orders/${orderId}`)
      .send({ status: 'printing' });
    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe('printing');

    // printing -> completed
    const res2 = await request(app)
      .patch(`/api/orders/${orderId}`)
      .send({ status: 'completed' });
    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('completed');
  });

  it('should reject invalid state transitions', async () => {
    // Create a fresh draft order
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Invalid Transition Test',
        items: [{ product_id: testProductId, quantity: 1 }]
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.order_id;

    // draft -> delivered (skip all steps — invalid!)
    const res = await request(app)
      .patch(`/api/orders/${orderId}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should cancel an order WITHOUT loss counting and remain editable', async () => {
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Cancel No Loss Test',
        items: [{ product_id: testProductId, quantity: 1 }]
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.order_id;

    // Cancel without loss
    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}`)
      .send({ status: 'cancelled', is_loss_counted: false });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');
    expect(cancelRes.body.data.is_loss_counted).toBe(false);

    // Should NOT be locked — PATCH again should return 400 (terminal state, not 409 lock)
    const patchAgain = await request(app)
      .patch(`/api/orders/${orderId}`)
      .send({ status: 'printing' });
    expect(patchAgain.status).toBe(400); // No valid transitions from cancelled
    expect(patchAgain.body.success).toBe(false);
  });

  it('should activate Ironclad Lock when cancelling with is_loss_counted = true', async () => {
    // 1. Create a fresh draft order
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Ironclad Lock Test',
        items: [{ product_id: testProductId, quantity: 1 }]
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.order_id;

    // 2. Cancel WITH loss counting -> activates Ironclad Lock in DB
    const cancelRes = await request(app)
      .patch(`/api/orders/${orderId}`)
      .send({ status: 'cancelled', is_loss_counted: true });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe('cancelled');
    expect(cancelRes.body.data.is_loss_counted).toBe(true);

    // 3. Any subsequent PATCH on this order must be rejected (pre-check returns 409)
    const lockedPatch = await request(app)
      .patch(`/api/orders/${orderId}`)
      .send({ status: 'draft' });
    expect(lockedPatch.status).toBe(409);
    expect(lockedPatch.body.success).toBe(false);
    expect(lockedPatch.body.message).toContain('khóa cứng');
  });
});
