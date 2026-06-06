import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { db } from '../src/core/database/client';

describe('Operational Configs API Integration Tests', () => {
  beforeEach(async () => {
    // Isolated state: delete configs and seed default test values
    await db('operational_configs').del();
    await db('operational_configs').insert([
      { key: 'machine_depreciation_per_hour', value: '5000.0000', description: 'Test depreciation' },
      { key: 'labor_cost_per_minute', value: '500.0000', description: 'Test labor' }
    ]);
  });

  afterAll(async () => {
    // Clean up to keep isolation
    await db('operational_configs').del();
    await db.destroy();
  });

  describe('GET /api/operational-configs', () => {
    it('should return operational configs in flat key-value shape', async () => {
      const res = await request(app).get('/api/operational-configs');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        machine_depreciation_per_hour: 5000,
        labor_cost_per_minute: 500
      });
    });
  });

  describe('PUT /api/operational-configs', () => {
    it('should successfully update operational configs', async () => {
      const res = await request(app)
        .put('/api/operational-configs')
        .send({
          machine_depreciation_per_hour: 6000.5,
          labor_cost_per_minute: 600
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        machine_depreciation_per_hour: 6000.5,
        labor_cost_per_minute: 600
      });

      // Verify database state
      const dbRows = await db('operational_configs').select('key', 'value');
      const data = dbRows.reduce<Record<string, number>>((acc, row) => {
        acc[row.key] = Number(row.value);
        return acc;
      }, {});

      expect(data.machine_depreciation_per_hour).toBe(6000.5);
      expect(data.labor_cost_per_minute).toBe(600);
    });

    it('should reject negative values', async () => {
      const res = await request(app)
        .put('/api/operational-configs')
        .send({
          machine_depreciation_per_hour: -100,
          labor_cost_per_minute: 500
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject invalid types / empty strings (avoiding coercion trap)', async () => {
      const res1 = await request(app)
        .put('/api/operational-configs')
        .send({
          machine_depreciation_per_hour: '',
          labor_cost_per_minute: 500
        });

      expect(res1.status).toBe(400);
      expect(res1.body.success).toBe(false);

      const res2 = await request(app)
        .put('/api/operational-configs')
        .send({
          machine_depreciation_per_hour: null,
          labor_cost_per_minute: 500
        });

      expect(res2.status).toBe(400);
      expect(res2.body.success).toBe(false);
    });
  });
});
