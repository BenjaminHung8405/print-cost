# DATABASE SETUP GUIDE - Schema V4 Ironclad Edition

PrintCost Database Layer - Production-Grade PostgreSQL 16 Implementation

---

## 📋 Quick Start (Choose One)

### Option 1: Full Stack Test (Database + Nginx + Backend stubs)
```bash
# Prerequisites: Docker Desktop or OrbStack running
cd /Users/benjaminhung8405/Code/print-cost

# Start only database (before backend is ready)
docker-compose -f docker-compose.test.yml up -d
```

### Option 2: Full Production Deploy (When backend/frontend ready)
```bash
docker-compose up -d
```

---

## ✅ Database Initialization Details

### What Happens When Container Starts
1. **PostgreSQL 16 image** pulls from Docker Hub
2. **Volume mounts** `scripts/init.sql` to `/docker-entrypoint-initdb.d/`
3. **Container startup** automatically executes all `.sql` files in that folder
4. **Schema V4** is created with:
   - 4 custom functions (with defensive programming)
   - 7 tables (materials, operational_configs, fixed_items, products, product_fixed_items, orders, order_items)
   - 5 indexes (on foreign keys for performance)
   - 7 triggers (auto-update + ironclad locks)
   - 1 view (view_orders_summary for reporting)
   - Seed data: 4 materials, 8 fixed items, 2 operational configs

### Schema V4 Key Features

#### 🔒 Defensive Functions
```plpgsql
-- 1. round_to_100(raw_value NUMERIC)
-- Ensures no negative values ever reach the database
-- Throws exception: "LỖI HỆ THỐNG: Giá trị tài chính không được phép âm (value)"

-- 2. enforce_order_lock()
-- Prevents UPDATE/DELETE on cancelled orders with is_loss_counted = TRUE
-- Throws exception: "LỖI BẢO MẬT: Đơn hàng số X đã bị khóa..."

-- 3. enforce_order_items_lock()
-- Prevents changes to line items when parent order is locked
-- Includes race-condition defense: checks if parent order exists
```

#### 🛡️ Immutable Data Layer (GENERATED ALWAYS AS)
```sql
-- raw_unit_cogs = raw_material_cost + raw_machine_cost + raw_labor_cost + raw_fixed_items_cost
-- total_item_price = final_unit_price * quantity

-- These columns CANNOT be manually set - database calculates them always
-- Eliminates drift between components
```

#### ⚡ Auto-Updated Timestamps
```sql
-- Every table (materials, fixed_items, products, orders, operational_configs)
-- has an AUTO-UPDATE trigger on 'updated_at' column
-- No need for app to remember to set it
```

#### 🔐 Constraint on final_unit_price
```sql
CONSTRAINT check_price_is_rounded 
  CHECK (final_unit_price = round_to_100(final_unit_price))

-- This FORCES the backend to always call round_to_100()
-- If backend sends 24,901đ instead of 25,000đ, DB rejects it
-- Database becomes guardian of your pricing logic
```

---

## 🧪 Testing Database Initialization

### Test 1: Verify Container is Healthy
```bash
docker-compose -f docker-compose.test.yml logs db | grep "NOTICE"
```

Expected output:
```
PRINTCOST DATABASE V4 - INITIALIZATION COMPLETE
Tables: materials, operational_configs, fixed_items, products, product_fixed_items, orders, order_items
Functions: round_to_100, update_modified_column, enforce_order_lock, enforce_order_items_lock
Triggers: Auto-lock mechanisms + updated_at automation ACTIVE
Views: view_orders_summary ready for reporting
```

### Test 2: List All Tables
```bash
docker exec printcost_db_test psql -U admin -d printcost_db -c "\dt"
```

Expected output:
```
              List of relations
 Schema |           Name            | Type  | Owner 
--------+---------------------------+-------+-------
 public | fixed_items               | table | admin
 public | materials                 | table | admin
 public | operational_configs       | table | admin
 public | order_items               | table | admin
 public | orders                    | table | admin
 public | product_fixed_items       | table | admin
 public | products                  | table | admin
(7 rows)
```

### Test 3: Check Seed Data
```bash
# Check materials
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT name, price_per_kg, fail_rate, default_margin FROM materials;"

# Check fixed items
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT name, item_type, cost FROM fixed_items LIMIT 5;"

# Check operational configs
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT key, value, description FROM operational_configs;"
```

### Test 4: Test INSERT with Constraints
```bash
# This should SUCCEED (rounded price)
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
INSERT INTO orders (customer_name, customer_contact, status) 
  VALUES ('Test Customer', '0123456789', 'draft');
EOF

# This should FAIL (unrounded price)
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
INSERT INTO order_items (order_id, snapshot_product_name, snapshot_material_name, 
  snapshot_weight_gram, snapshot_print_time_seconds, snapshot_labor_time_minutes,
  snapshot_fail_rate, snapshot_margin,
  raw_material_cost, raw_machine_cost, raw_labor_cost, raw_fixed_items_cost,
  final_unit_price, quantity)
VALUES (1, 'Test', 'PLA', 100.0, 3600, 5, 1.1, 0.4, 
  5000.0, 1000.0, 500.0, 376.0, 24901.00, 1);  -- 24901 is not divisible by 100!
EOF
```

Expected error:
```
ERROR:  new row for relation "order_items" violates check constraint "check_price_is_rounded"
```

### Test 5: Test Order Lock Mechanism
```bash
# Create order and mark as cancelled+loss_counted
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
INSERT INTO orders (customer_name, status, is_loss_counted) 
  VALUES ('Locked Customer', 'cancelled', TRUE);

-- Now try to update (should FAIL)
UPDATE orders SET customer_name = 'Hacked' WHERE id = 2;
EOF
```

Expected error:
```
ERROR:  LỖI BẢO MẬT: Đơn hàng số 2 đã bị khóa do hủy và tính hao hụt xưởng. Không thể chỉnh sửa!
```

---

## 🔧 Database Access from Backend

### Connection String Format (from `.env`)
```
postgres://{DB_USER}:{DB_PASSWORD}@db:5432/{DB_NAME}
postgres://admin:printcost_dev_password_12345@db:5432/printcost_db
```

### Node.js Example (for backend reference)
```javascript
// backend/src/db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Query example - insert order item with rounded price
async function createOrderItem(orderItem) {
  const roundedPrice = Math.round(orderItem.price / 100) * 100;
  
  const query = `
    INSERT INTO order_items (order_id, product_id, snapshot_product_name, ...)
    VALUES ($1, $2, $3, ...)
  `;
  
  const values = [
    orderItem.orderId,
    orderItem.productId,
    orderItem.productName,
    // ... ensure final_unit_price is ALWAYS rounded!
    roundedPrice,
    // ...
  ];
  
  return pool.query(query, values);
}

module.exports = pool;
```

---

## 📊 View Operational Reporting

### Revenue Summary Report
```bash
# Get total revenue by order
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  order_id,
  customer_name,
  status,
  total_raw_cogs,
  total_final_invoice_price,
  (total_final_invoice_price - total_raw_cogs) AS profit
FROM view_orders_summary
ORDER BY created_at DESC;
EOF
```

---

## 🚀 Next Steps

1. ✅ **Database initialized** → Move to backend development
2. ⏭️ **Backend API development** → Implement calculation engine
3. ⏭️ **Frontend** → Build dashboard for order management
4. ⏭️ **Integration testing** → End-to-end flow validation

---

## ❓ Troubleshooting

### PostgreSQL Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.test.yml logs db

# Reset database (WARNING: loses all data)
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

### Can't Connect from psql
```bash
# Verify container is running
docker ps | grep postgres

# Try connecting with long timeout
docker exec printcost_db_test psql -U admin -d printcost_db -c "SELECT 1" --timeout=10
```

### Constraints Are Too Strict
- By design! Database-level constraints protect data integrity
- Backend must validate data BEFORE sending to DB
- This is production-grade defensive programming
