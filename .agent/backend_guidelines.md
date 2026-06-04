# 📘 PrintCost - Backend Development Guidelines

This document is compiled by a Senior Developer to provide coding rules, design patterns, and instructions for handling specific issues (Financial Mathematics, Database Transactions/Triggers, Zod Validation, and Testing) during the backend implementation of the **PrintCost** project.

All AI Agents and developers contributing to the Backend codebase must read and strictly adhere to these standards.

---

## 1. Financial Precision & Big.js

### 1.1. Core Principles
* **ABSOLUTELY DO NOT** use standard arithmetic operators (`+`, `-`, `*`, `/`) or native float types (`number` in JS) for intermediate calculations of currency, costs, or profit margins.
* All intermediate calculations must use the `big.js` library (which is already imported and configured in `engine.ts`).
* Only convert the `Big` data type back to a standard JS `number` at the final output (JSON Response) or when storing to the database (preserving the precision of `NUMERIC` fields in Postgres).

### 1.2. Configuration & Standard Usage
Configure the rounding mode to `ROUND_HALF_UP` (mode `1` in Big.js) globally before executing any calculations:

```typescript
import Big from 'big.js';

// Configure Big.js to use ROUND_HALF_UP (Round mode = 1)
Big.RM = 1;
```

#### COGS (Cost of Goods Sold) calculation:
```typescript
// INCORRECT (causes floating-point precision issues):
const rawMaterialCost = weightGram * (pricePerKg / 1000) * failRate;

// CORRECT (using Big.js):
const rawMaterialCost = Big(weightGram)
  .times(Big(pricePerKg).div(1000))
  .times(failRate);
```

#### Suggested Retail Price calculation:
```typescript
// Formula: COGS / (1 - Margin)
// CORRECT:
const rawSuggestedPrice = rawUnitCogs.div(Big(1).minus(margin));
```

### 1.3. Rounding Rules (Financial Rounding)
The actual final unit price chốt bán (`final_unit_price`) must be rounded to the nearest **100 VND** (the smallest cash denomination in VND).
* The system rounding function `roundTo100` is defined as:

```typescript
export function roundTo100(rawValue: Big): number {
  if (rawValue.lt(0)) {
    throw new Error('SYSTEM ERROR: Financial values cannot be negative');
  }
  
  // Algorithm: Round(X / 100) * 100
  const divided = rawValue.div(100);
  const rounded = divided.round(0); // Uses Big.RM configured global round mode (ROUND_HALF_UP)
  
  return rounded.times(100).toNumber();
}
```

---

## 2. Database Integration (PostgreSQL & Knex.js Transactions)

### 2.1. Transaction Management
When writing data to multiple parent-child tables (e.g., creating a new order and storing its associated order items), it is **mandatory** to wrap them in a Database Transaction. If any individual item insertion fails, the entire transaction must rollback.

```typescript
import { db } from '../database/client';

export async function createOrderWithItems(orderData: any, items: any[]) {
  return await db.transaction(async (trx) => {
    // 1. Insert parent order
    const [insertedOrder] = await trx('orders')
      .insert({
        customer_name: orderData.customer_name,
        customer_contact: orderData.customer_contact,
        status: 'draft',
      })
      .returning('*');

    // 2. Prepare items with calculated cost snapshots
    const itemsToInsert = items.map(item => {
      // Execute pricing calculations...
      return {
        order_id: insertedOrder.id,
        product_id: item.product_id,
        snapshot_product_name: item.name,
        // ... other snapshot fields
        final_unit_price: item.final_unit_price,
        quantity: item.quantity,
      };
    });

    // 3. Insert child items
    await trx('order_items').insert(itemsToInsert);

    return insertedOrder;
  });
}
```

### 2.2. Handling DB Triggers & Constraints
Database Schema V4 has strong defensive triggers (such as locking orders when cancelled/loss is counted, or validating final price rounding). When backend queries violate these rules, Postgres throws an exception. The backend must catch these errors gracefully.

#### PostgreSQL Error Codes to watch for:
* `P0001` (`raise_exception`): Custom triggers (e.g., order lock rules).
* `23514` (`check_violation`): Violated CHECK constraints (e.g., negative money or unrounded price).
* `23505` (`unique_violation`): Unique key collision (e.g., duplicate material name).
* `23503` (`foreign_key_violation`): Foreign key failure (e.g., deleting a material in use).

#### Express Database Error Handler Middleware:
```typescript
import { Request, Response, NextFunction } from 'express';

export function dbErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Database Error:', err);

  // Catch PostgreSQL error codes
  if (err.code) {
    switch (err.code) {
      case 'P0001': // Custom trigger exception
        return res.status(409).json({
          success: false,
          message: `Database Business Rule Error: ${err.message.replace('error: ', '')}`,
        });
      
      case '23514': // Check constraint violation
        return res.status(400).json({
          success: false,
          message: 'The submitted data violates financial or structural safety integrity checks.',
          detail: err.constraint,
        });

      case '23505': // Unique violation
        return res.status(409).json({
          success: false,
          message: 'An object with the same identifier or name already exists in the system.',
        });

      case '23503': // Foreign key constraint violation
        return res.status(400).json({
          success: false,
          message: 'Cannot perform operation because this record is currently referenced by other data.',
        });
    }
  }

  // Fallback for general server errors
  return res.status(500).json({
    success: false,
    message: err.message || 'An unexpected database error occurred.',
  });
}
```

---

## 3. Avoiding Zod Validation Pitfalls

### 3.1. The Coercion Trap
In Express, payloads from `req.body` or `req.query` are often strings. We commonly use `z.coerce.number()` to automatically cast them. However, this has a significant pitfall:
* `z.coerce.number().parse("")` $\rightarrow$ results in `0` (which passes positive checks but is invalid data).
* `z.coerce.number().parse(null)` $\rightarrow$ results in `0`.

#### Safe Schema Validation Pattern:
Always preprocess empty strings and nulls to `undefined` before executing numeric validation checks:

```typescript
import { z } from 'zod';

// Helper to safely coerce numbers without converting empty strings to 0
const safeCoerceNumber = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) {
    return undefined;
  }
  return val;
}, z.coerce.number());

// Safe product schema definition
export const productInputSchema = z.object({
  name: z.string().trim().min(1, 'Product name cannot be empty'),
  weight_gram: safeCoerceNumber.pipe(
    z.number().positive('Weight must be greater than 0')
  ),
  print_time_seconds: safeCoerceNumber.pipe(
    z.number().int('Print time must be an integer').positive('Print time must be greater than 0')
  ),
  labor_time_minutes: safeCoerceNumber.pipe(
    z.number().int('Labor time must be an integer').nonnegative('Labor time must be >= 0')
  ),
});
```

---

## 4. Integration Testing Guidelines (Vitest & Test DB)

To ensure backend calculations and triggers are always verified, we must implement automated integration tests.

### 4.1. Test Database Isolation
When running tests, they must run on a completely isolated database (configured in `docker-compose.test.yml`).

1. Test Execution Command: `npm run test` (mapped to `vitest run`).
2. Clean database tables before each test case to prevent cross-test contamination.

#### Test Setup Module:
```typescript
import { db } from '../../core/database/client';
import { beforeAll, beforeEach, afterAll } from 'vitest';

beforeAll(async () => {
  // Verify database connection is healthy
  await db.raw('SELECT 1');
});

beforeEach(async () => {
  // Truncate tables to ensure isolated runs
  // Note: Cascade is used to truncate tables with foreign key constraints
  await db.raw('TRUNCATE TABLE order_items, orders, product_fixed_items, products, fixed_items, materials RESTART IDENTITY CASCADE');
  
  // Inject default configuration needed for calculations
  await db('operational_configs').insert([
    { key: 'machine_depreciation_per_hour', value: 5000.0000 },
    { key: 'labor_cost_per_minute', value: 500.0000 }
  ]).onConflict('key').merge();
});

afterAll(async () => {
  // Close database pool connection after all tests run
  await db.destroy();
});
```

### 4.2. Testing Database Triggers & Financial Constraints
Write tests that intentionally supply invalid data to ensure the database defensive layer rejects them:

```typescript
import { expect, test } from 'vitest';
import { db } from '../../core/database/client';

test('DB Constraint: Rejects retail prices that are not rounded to 100 VND', async () => {
  // Create a draft order
  const [order] = await db('orders').insert({ customer_name: 'Test Customer' }).returning('*');
  
  // Intentionally supply an unrounded retail price (e.g. 12,550 VND)
  await expect(
    db('order_items').insert({
      order_id: order.id,
      snapshot_product_name: 'Keycap',
      snapshot_material_name: 'PLA',
      snapshot_weight_gram: 10.00,
      snapshot_print_time_seconds: 3600,
      snapshot_labor_time_minutes: 10,
      snapshot_fail_rate: 1.10,
      snapshot_margin: 0.40,
      raw_material_cost: 2750.00,
      raw_machine_cost: 5000.00,
      raw_labor_cost: 5000.00,
      raw_fixed_items_cost: 0.00,
      final_unit_price: 12550.00, // Violates round_to_100() constraint check
      quantity: 1
    })
  ).rejects.toThrow(); // DB must reject this insert operation
});
```

---

*End of Guidelines. Make sure to apply these instructions when developing any new endpoints or calculation logic.*
