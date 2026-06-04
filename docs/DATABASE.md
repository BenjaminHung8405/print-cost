# 🗄️ DATABASE SETUP & OPERATIONS GUIDE

**PrintCost Database Layer - PostgreSQL 16 Schema V4 Ironclad Edition**

---

## 📋 Quick Start

### Option 1: Database Only (Test)
```bash
cd /Users/benjaminhung8405/Code/print-cost

# Cleanup old container
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# Start database
docker-compose -f docker-compose.test.yml up -d

# Wait for initialization
sleep 15

# Verify
docker ps | grep printcost_db_test
```

### Option 2: Full Stack (Production)
```bash
docker-compose down -v 2>/dev/null || true
docker-compose up -d
sleep 20
docker ps
```

---

## ✅ Database Initialization

### What Happens on Startup

1. PostgreSQL 16 image pulls
2. `scripts/init.sql` executes automatically
3. Schema V4 created with:
   - **7 tables**: materials, operational_configs, fixed_items, products, product_fixed_items, orders, order_items
   - **4 functions**: round_to_100(), update_modified_column(), enforce_order_lock(), enforce_order_items_lock()
   - **7 triggers**: auto-update timestamps + ironclad locks
   - **1 view**: view_orders_summary (reporting)
   - **Seed data**: 4 materials, 8 fixed items, 2 operational configs

### Schema V4 Features at a Glance

| Feature | Details |
|---------|---------|
| **Database** | PostgreSQL 16 Alpine (minimal, ~300MB) |
| **Tables** | 7 (materials, configs, fixed_items, products, orders, etc.) |
| **Functions** | 4 defensive + 3 utility functions |
| **Triggers** | 7 (auto-update + ironclad order locks) |
| **Constraints** | 25+ CHECK constraints (defensive DB layer) |
| **Views** | 1 reporting view (view_orders_summary) |
| **Indexes** | 5 on critical columns for performance |
| **Seed Data** | Pre-populated with sample materials & configs |

---

## 🛡️ Database-Level Defenses (Ironclad)

### 1. Rounding Function - No Pennies!
```sql
-- round_to_100(raw_value) → Always returns value divisible by 100
-- If negative value: THROWS ERROR
-- Backend MUST call round_to_100() before INSERT

SELECT round_to_100(24950.5) AS result;  -- Returns: 25000
SELECT round_to_100(-100);               -- ERROR: "Giá trị tài chính không được phép âm"
```

**In database:**
```sql
CONSTRAINT check_price_is_rounded 
  CHECK (final_unit_price = round_to_100(final_unit_price))
```

If backend sends unrounded price (24,901 instead of 25,000) → DB rejects it.

### 2. Order Locking - Prevents Tampering
```sql
-- Cannot UPDATE/DELETE order if:
--   status = 'cancelled' AND is_loss_counted = TRUE

-- Trigger: enforce_order_lock()
-- Error message: "LỖI BẢO MẬT: Đơn hàng số X đã bị khóa..."
```

### 3. Generated Columns - Auto-Calculated
```sql
-- raw_unit_cogs = SUM(raw_material_cost + raw_machine_cost + raw_labor_cost + raw_fixed_items_cost)
-- total_item_price = final_unit_price * quantity
-- Cannot be manually set → prevents data drift
```

### 4. Value Validation (CHECK Constraints)
```
✓ price_per_kg > 0
✓ fail_rate >= 1.00 (hao hụt >= 0%)
✓ default_margin BETWEEN 0.00 AND 1.00 (0-100%)
✓ cost >= 0
✓ weight_gram > 0
✓ quantity > 0
```

### 5. Auto-Updated Timestamps
Every table has `updated_at` trigger - automatically updates on any modification. No need for app to remember!

---

## 🧪 Verify Database Installation

### Test 1: Container is Running
```bash
docker exec -it printcost_db_test pg_isready -U admin
# Should output: "accepting connections"
```

### Test 2: All Tables Exist
```bash
docker exec printcost_db_test psql -U admin -d printcost_db -c "\dt"

# Expected: 7 tables
# public | materials               | table | admin
# public | operational_configs     | table | admin
# public | fixed_items             | table | admin
# ... etc
```

### Test 3: Seed Data Present
```bash
# Check materials
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT name, price_per_kg, fail_rate, default_margin FROM materials;"

# Expected output:
# name | price_per_kg | fail_rate | default_margin
# -----+--------------+-----------+----------------
# PLA  |   250000.00  |      1.10 |           0.40
# PETG |   203000.00  |      1.00 |           0.30
# ABS  |   280000.00  |      1.15 |           0.35
# TPU  |   350000.00  |      1.05 |           0.45
```

### Test 4: Functions Working
```bash
# Test round_to_100()
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  round_to_100(24950.5) AS "24950.5 → ?",
  round_to_100(5000.1) AS "5000.1 → ?",
  round_to_100(0) AS "0 → ?";
EOF

# Expected:
# 24950.5 → ? | 5000.1 → ? | 0 → ?
# -----------+----------+-------
#      25000 |     5000 |     0
```

### Test 5: Negative Values Rejected
```bash
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT round_to_100(-100);
EOF

# Expected ERROR: "LỖI HỆ THỐNG: Giá trị tài chính không được phép âm (-100)"
```

### Test 6: CHECK Constraints Enforced
```bash
# Try inserting with fail_rate < 1.0 (should FAIL)
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
INSERT INTO materials (name, price_per_kg, fail_rate, default_margin)
VALUES ('INVALID', 100000, 0.9, 0.3);
EOF

# Expected ERROR: "check constraint... violated"
```

### Test 7: Order Lock Mechanism
```bash
# Create a cancelled order with is_loss_counted = TRUE
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
INSERT INTO orders (customer_name, status, is_loss_counted) 
VALUES ('Locked', 'cancelled', TRUE);

-- Try to update (should FAIL)
UPDATE orders SET customer_name = 'Hacked' WHERE id = 1;
EOF

# Expected ERROR: "LỖI BẢO MẬT: Đơn hàng số 1 đã bị khóa..."
```

### Run All Tests at Once
```bash
chmod +x scripts/test-db.sh
bash scripts/test-db.sh

# Expected output:
# ✓ PASS: Container running
# ✓ PASS: All tables exist
# ✓ PASS: Seed data present
# ✓ PASS: Functions working
# ... 15 tests total
# ═══════════════════════════════════════════
# ✓ ALL TESTS PASSED
# Schema V4 is ready for production use!
# ═══════════════════════════════════════════
```

---

## 📊 View Seed Data

### Materials (Vật liệu)
```bash
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT id, name, price_per_kg, fail_rate, default_margin, created_at
FROM materials
ORDER BY id;
EOF
```

### Operational Configs (Cấu hình chi phí)
```bash
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT key, value, description, updated_at
FROM operational_configs
ORDER BY key;
EOF
```

### Fixed Items (Chi phí cố định)
```bash
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT id, name, item_type, cost, created_at
FROM fixed_items
ORDER BY id;
EOF
```

---

## 🔗 Backend Connection

### Connection String
```
postgresql://admin:printcost_dev_password_12345@localhost:5432/printcost_db
```

**From container (internal):**
```
postgresql://admin:printcost_dev_password_12345@db:5432/printcost_db
```

### Node.js Example
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Example: Insert order item with rounded price
async function createOrderItem(orderItem) {
  // ⚠️ MUST call round_to_100() before sending to DB
  const roundedPrice = Math.round(orderItem.price / 100) * 100;
  
  const query = `
    INSERT INTO order_items (
      order_id, snapshot_product_name, final_unit_price, quantity, ...
    ) VALUES ($1, $2, $3, $4, ...)
  `;
  
  return pool.query(query, [
    orderItem.orderId,
    orderItem.productName,
    roundedPrice,  // ← MUST be rounded!
    orderItem.quantity,
  ]);
}

module.exports = pool;
```

---

## 🔄 Database Operations

### Manual Backup
```bash
docker exec printcost_db_test pg_dump -U admin -d printcost_db \
  | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore from Backup
```bash
gunzip -c backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i printcost_db_test psql -U admin -d printcost_db
```

### Automated Backups
```bash
chmod +x scripts/backup.sh scripts/setup-launchd.sh
./scripts/setup-launchd.sh  # Daily at 2 AM
```

### Check Database Size
```bash
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT pg_size_pretty(pg_database_size('printcost_db'));"
```

### View Slow Queries
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

---

## 📊 Reporting View

### Revenue Summary Report
```bash
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  order_id,
  customer_name,
  status,
  total_raw_cogs,
  total_final_invoice_price,
  (total_final_invoice_price - total_raw_cogs) AS profit
FROM view_orders_summary
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
EOF
```

---

## 🛠️ Troubleshooting

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.test.yml logs db | tail -50

# Check if port 5432 is in use
lsof -i :5432

# Reset database
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
sleep 20
```

### Can't Connect to Database
```bash
# Wait longer for initialization
sleep 30

# Verify container is healthy
docker ps | grep printcost_db_test

# Check connection
docker exec printcost_db_test pg_isready -U admin -d printcost_db

# Test query
docker exec printcost_db_test psql -U admin -d printcost_db -c "SELECT 1;"
```

### psql Command Not Found
```bash
brew install postgresql
```

### Database Size Growing Too Fast
```bash
# Check what's using space
docker exec printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF
```

### Performance Issues
```bash
# Check active connections
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# Restart database if needed
docker-compose -f docker-compose.test.yml restart db
sleep 15
```

---

## 📈 Storage & Capacity

### Database Size Growth

| Timeframe | Data | WAL Logs | Total | Notes |
|-----------|------|----------|-------|-------|
| Empty | 8 MB | 1 GB | ~1 GB | Initial |
| 1 year | 2-5 MB | 1 GB | ~1 GB | 100 orders/month |
| 3 years | 6-15 MB | 1 GB | ~1 GB | 300 orders/month |
| 5 years | 10-25 MB | 1 GB | ~1 GB | Negligible growth |

**Key Point**: Actual data is tiny. WAL logs are ~1GB and self-rotate. Unless you store binary files (images), storage is not a concern for 10+ years of operations!

### Storage Optimization Tips
```
✅ DO: Store image URLs → /uploads folder (served by Nginx)
❌ DON'T: Store binary files in database (Base64/Blob)

# Docker storage can be limited:
volumes:
  postgres_data:
    driver_opts:
      type: tmpfs
      o: "size=5GB"  # Limit to 5GB max
```

---

## 📝 Connection Pool Best Practices

For production backends:
```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                      // Max connections in pool
  idleTimeoutMillis: 30000,     // Close idle after 30s
  connectionTimeoutMillis: 2000, // Timeout if can't connect after 2s
});

// Graceful shutdown
process.on('SIGTERM', () => {
  pool.end(() => {
    console.log('Pool closed');
    process.exit(0);
  });
});
```

---

## 🔐 Security Checklist

- [ ] Change DB_PASSWORD in .env
- [ ] Database not exposed externally (only Docker network)
- [ ] Backups encrypted (if cloud sync)
- [ ] .env added to .gitignore
- [ ] Regular backup verification (test restore)
- [ ] Monitor database logs for suspicious activity

---

**Database is the foundation. Get it right! ✅**
