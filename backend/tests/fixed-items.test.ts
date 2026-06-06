import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/core/database/client';

// ─────────────────────────────────────────────────────────────────────────────
// Test lifecycle — isolate fixed_items table between each test
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  // Truncate join table first (FK dependency), then fixed_items
  await db.raw(
    'TRUNCATE TABLE product_fixed_items, fixed_items RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await db.raw(
    'TRUNCATE TABLE product_fixed_items, fixed_items RESTART IDENTITY CASCADE'
  );
  await db.destroy();
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function seedItem(overrides: {
  name?: string;
  item_type?: string;
  cost?: number;
} = {}) {
  const [item] = await db('fixed_items')
    .insert({
      name: overrides.name ?? 'Hộp carton',
      item_type: overrides.item_type ?? 'packaging',
      cost: overrides.cost ?? 859,
    })
    .returning('*');
  return item;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/fixed-items
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/fixed-items', () => {
  it('should return an empty array when catalog is empty', async () => {
    const res = await request(app).get('/api/fixed-items');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('should return all items ordered by id asc', async () => {
    await seedItem({ name: 'Sticker niêm phong', item_type: 'packaging', cost: 376 });
    await seedItem({ name: 'Móc khoá', item_type: 'accessory', cost: 2500 });

    const res = await request(app).get('/api/fixed-items');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    // Verify shape — cost serialized as string from NUMERIC column, use Number() coercion
    const first = res.body.data[0];
    expect(first.id).toEqual(expect.any(Number));
    expect(first.name).toBe('Sticker niêm phong');
    expect(first.item_type).toBe('packaging');
    expect(Number(first.cost)).toBeGreaterThan(0);

    // Verify ordering: id ascending
    const ids = res.body.data.map((i: any) => i.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/fixed-items
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/fixed-items', () => {
  it('should create a packaging item successfully', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: 'Hộp carton', item_type: 'packaging', cost: 859 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: expect.any(Number),
      name: 'Hộp carton',
      item_type: 'packaging',
    });
    // Cost stored as NUMERIC — verify it comes back as a number
    expect(Number(res.body.data.cost)).toBe(859);
  });

  it('should create an accessory item successfully', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: 'Nam châm', item_type: 'accessory', cost: 2000 });

    expect(res.status).toBe(201);
    expect(res.body.data.item_type).toBe('accessory');
  });

  it('should accept fractional cost (e.g. 376.67 from bulk-price division)', async () => {
    // Simulates: totalPrice=376000 / lotQty=998 ≈ 376.7535... → rounded to 376.75
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: 'Sticker niêm phong', item_type: 'packaging', cost: 376.75 });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.cost)).toBeCloseTo(376.75, 2);
  });

  it('should reject when name is empty', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: '   ', item_type: 'packaging', cost: 500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  it('should reject when name is missing', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ item_type: 'packaging', cost: 500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject negative cost', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: 'Hộp carton', item_type: 'packaging', cost: -100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid item_type', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: 'Hộp carton', item_type: 'box', cost: 500 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject empty string cost (avoiding coercion trap)', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: 'Hộp carton', item_type: 'packaging', cost: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject null cost', async () => {
    const res = await request(app)
      .post('/api/fixed-items')
      .send({ name: 'Hộp carton', item_type: 'packaging', cost: null });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/fixed-items/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('PUT /api/fixed-items/:id', () => {
  it('should update cost of an existing item', async () => {
    const item = await seedItem({ name: 'Giấy pelure', cost: 385 });

    const res = await request(app)
      .put(`/api/fixed-items/${item.id}`)
      .send({ name: 'Giấy pelure', item_type: 'packaging', cost: 420 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.cost)).toBe(420);
  });

  it('should update item_type and name of an existing item', async () => {
    const item = await seedItem({ name: 'Khoen 12mm', item_type: 'accessory', cost: 300 });

    const res = await request(app)
      .put(`/api/fixed-items/${item.id}`)
      .send({ name: 'Khoen 16mm', item_type: 'accessory', cost: 500 });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Khoen 16mm');
    expect(Number(res.body.data.cost)).toBe(500);
  });

  it('should return 404 for non-existent id', async () => {
    const res = await request(app)
      .put('/api/fixed-items/999999')
      .send({ name: 'Ghost Item', item_type: 'packaging', cost: 100 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should reject invalid payload on update', async () => {
    const item = await seedItem();

    const res = await request(app)
      .put(`/api/fixed-items/${item.id}`)
      .send({ name: '', item_type: 'packaging', cost: 100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/fixed-items/:id
// ─────────────────────────────────────────────────────────────────────────────

describe('DELETE /api/fixed-items/:id', () => {
  it('should delete an existing item successfully', async () => {
    const item = await seedItem({ name: 'Ốc vít', item_type: 'accessory', cost: 150 });

    const res = await request(app).delete(`/api/fixed-items/${item.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify gone from DB
    const remaining = await db('fixed_items').where({ id: item.id }).first();
    expect(remaining).toBeUndefined();
  });

  it('should return 404 when deleting non-existent item', async () => {
    const res = await request(app).delete('/api/fixed-items/999999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('should return 400 when item is linked to a product (FK violation)', async () => {
    // Seed a material and product first, then link fixed item to it
    const item = await seedItem({ name: 'Hộp được dùng', cost: 859 });

    const [material] = await db('materials')
      .insert({
        name: 'PLA Test',
        price_per_kg: 250000,
        fail_rate: 1.1,
        default_margin: 0.4,
      })
      .returning('*');

    const [product] = await db('products')
      .insert({
        name: 'Test Product',
        material_id: material.id,
        weight_gram: 10,
        print_time_seconds: 3600,
        labor_time_minutes: 5,
      })
      .returning('*');

    // Link the fixed item to the product
    await db('product_fixed_items').insert({
      product_id: product.id,
      fixed_item_id: item.id,
      quantity: 1,
    });

    // Attempt delete — must fail with FK violation (23503 or P0001 trigger)
    const res = await request(app).delete(`/api/fixed-items/${item.id}`);

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);

    // Cleanup seeded product data
    await db('product_fixed_items').where({ fixed_item_id: item.id }).del();
    await db('products').where({ id: product.id }).del();
    await db('materials').where({ id: material.id }).del();
  });
});
