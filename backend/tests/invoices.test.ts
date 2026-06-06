import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/core/database/client';
import { normalizePaymentInfo } from '../src/api/routes/invoices';

describe('Invoice API Integration Tests', () => {
  let testMaterialId: number;
  let testProductId: number;
  let testOrderId: number;

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
      name: 'TEST-PLA-INVOICE',
      price_per_kg: 250000.00,
      fail_rate: 1.10,
      default_margin: 0.40
    }).returning('*');
    testMaterialId = material.id;

    // 4. Seed product
    // weight_gram: 50g, print_time: 2 hours (7200s), labor: 10 min
    // raw_material_cost: 50 * (250000 / 1000) * 1.10 = 13750
    // raw_machine_cost: (7200 / 3600) * 5000 = 10000
    // raw_labor_cost: 10 * 500 = 5000
    // raw_unit_cogs: 13750 + 10000 + 5000 = 28750
    // final_suggested_price: roundTo100(28750 / 0.60) = roundTo100(47916.67) = 47900
    const [product] = await db('products').insert({
      name: 'TEST-INVOICE-BOX',
      material_id: testMaterialId,
      weight_gram: 50.00,
      print_time_seconds: 7200,
      labor_time_minutes: 10,
      margin_override: null
    }).returning('*');
    testProductId = product.id;

    // 5. Create an order
    const res = await request(app)
      .post('/api/orders')
      .send({
        customer_name: 'Nguyen Van A',
        items: [{ product_id: testProductId, quantity: 3 }]
      });
    testOrderId = res.body.data.order_id;
  });

  afterAll(async () => {
    // Clean up database records (using TRUNCATE to bypass locks)
    await db.raw('TRUNCATE TABLE order_items, orders, product_fixed_items, products, fixed_items, materials RESTART IDENTITY CASCADE');
    await db('operational_configs').del();
    await db.destroy();
  });

  describe('normalizePaymentInfo unit tests', () => {
    it('should strip Vietnamese accents and convert to uppercase', () => {
      const input = 'Trần Đức Đạt @123!';
      const expected = 'TRAN DUC DAT 123';
      expect(normalizePaymentInfo(input)).toBe(expected);
    });

    it('should map đ and Đ correctly', () => {
      expect(normalizePaymentInfo('đường đi')).toBe('DUONG DI');
      expect(normalizePaymentInfo('ĐỒNG NAI')).toBe('DONG NAI');
    });
  });

  describe('GET /api/invoices/:order_id', () => {
    it('should return 404 for non-existent order', async () => {
      const res = await request(app).get('/api/invoices/99999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Không tìm thấy thông tin đơn hàng');
    });

    it('should return 200 with structured invoice details for valid order', async () => {
      const res = await request(app).get(`/api/invoices/${testOrderId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const invoice = res.body.data;
      expect(invoice.order_id).toBe(testOrderId);
      expect(invoice.invoice_id).toBe(`INV-${testOrderId.toString().padStart(4, '0')}`);
      expect(invoice.customer_name).toBe('Nguyen Van A');
      expect(invoice.status).toBe('draft');
      expect(invoice.total_amount).toBe(47900 * 3); // 143700

      expect(invoice.items.length).toBe(1);
      const item = invoice.items[0];
      expect(item.product_name).toBe('TEST-INVOICE-BOX');
      expect(item.material_name).toBe('TEST-PLA-INVOICE');
      expect(item.final_unit_price).toBe(47900);
      expect(item.quantity).toBe(3);
      expect(item.total_item_price).toBe(143700);

      // Verify payment details and VietQR url
      expect(invoice.payment_info.bank_id).toBe('MB');
      expect(invoice.payment_info.account_no).toBe('0000123456789');
      expect(invoice.payment_info.account_name).toBe('NGUYEN PHI HUNG');
      
      const qrUrl = invoice.payment_info.qr_code_url;
      expect(qrUrl).toContain('https://img.vietqr.io/image/MB-0000123456789-vietqr_pro.jpg');
      expect(qrUrl).toContain('amount=143700');
      // "THANH TOAN DON HANG OD <id>" normalized -> "THANH TOAN DON HANG OD <id>"
      const expectedAddInfo = encodeURIComponent(`THANH TOAN DON HANG OD ${testOrderId}`);
      expect(qrUrl).toContain(`addInfo=${expectedAddInfo}`);
      const expectedAccountName = encodeURIComponent('NGUYEN PHI HUNG');
      expect(qrUrl).toContain(`accountName=${expectedAccountName}`);
    });
  });
});
