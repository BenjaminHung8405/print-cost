# DEPLOYMENT GUIDE - PrintCost V4 on Mac Mini M4

## 🎯 Quick Start: Triển khai Database V4 trên Mac Mini M4

---

## Step 1: Chuẩn bị môi trường

### Kiểm tra Docker/OrbStack đã cài
```bash
docker --version
# Docker version 27.0+ (hoặc OrbStack equivalent)

docker ps
# Nếu lỗi, start Docker Desktop or OrbStack trước
```

### Kiểm tra project structure
```bash
cd ~/Code/print-cost
ls -la

# Phải có những file này:
# - docker-compose.yml
# - docker-compose.test.yml
# - scripts/init.sql
# - scripts/test-db.sh
# - .env
```

---

## Step 2: Khởi động Database Container

### Option A: Test Database Only (Nhanh & Sạch)
```bash
cd ~/Code/print-cost

# Xóa container cũ (nếu có)
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# Dựng database container mới
docker-compose -f docker-compose.test.yml up -d

# Chờ database khởi động (10-15 giây)
sleep 15

# Kiểm tra container running
docker ps | grep printcost_db_test
```

### Option B: Full Stack (Khi backend sẵn sàng)
```bash
cd ~/Code/print-cost

# Down tất cả container cũ
docker-compose down -v 2>/dev/null || true

# Dựng toàn bộ stack
docker-compose up -d

# Chờ databases healthy
sleep 20

# Kiểm tra
docker ps
```

---

## Step 3: Chạy Database Verification Script

```bash
# Make script executable
chmod +x scripts/test-db.sh

# Chạy test suite
bash scripts/test-db.sh
```

Expected output:
```
🚀 PRINTCOST DATABASE V4 - VERIFICATION SCRIPT
===============================================

[TEST 1] Verifying container is running...
✓ PASS: Container printcost_db_test is running

[TEST 2] Verifying database exists...
✓ PASS: Database printcost_db is accessible

[TEST 3] Verifying all tables exist...
✓ PASS: All 7 tables created successfully
        Schema |           Name            | Type  | Owner
        --------+---------------------------+-------+-------
        public | fixed_items               | table | admin
        public | materials                 | table | admin
        public | operational_configs       | table | admin
        public | order_items               | table | admin
        public | orders                    | table | admin
        public | product_fixed_items       | table | admin
        public | products                  | table | admin

[TEST 4] Verifying functions...
✓ PASS: Functions created (5 found)

[TEST 5] Verifying seed data - Materials...
✓ PASS: Materials seeded (4 records)
        name | price_per_kg | fail_rate | default_margin
        -----+--------------+-----------+----------------
        PLA  |   250000.00  |      1.10 |           0.40
        PETG |   203000.00  |      1.00 |           0.30
        ABS  |   280000.00  |      1.15 |           0.35
        TPU  |   350000.00  |      1.05 |           0.45

[TEST 6] Verifying seed data - Operational Configs...
✓ PASS: Operational configs seeded (2 records)
        key                            |    value     |              description
        ------+----------------------------------+-------
        labor_cost_per_minute          | 500.0000     | Tiền công thợ xử lý hậu kỳ mỗi phút
        machine_depreciation_per_hour  | 5000.0000    | Tiền điện và khấu hao máy in mỗi giờ

[TEST 7] Verifying seed data - Fixed Items...
✓ PASS: Fixed items seeded (6 records)
        name                   | item_type |  cost
        -----------------------+-----------+--------
        Sticker niêm phong     | packaging | 376.00
        Hộp carton             | packaging | 859.00
        ...

[TEST 8] Testing round_to_100() function...
✓ PASS: round_to_100(24950.5) = 25000 ✓

[TEST 9] Testing round_to_100() negative value rejection...
✓ PASS: round_to_100(-100) correctly rejected negative value

[TEST 10-13] Testing CHECK constraints...
✓ PASS: All constraints working correctly

[TEST 14] Testing order creation...
✓ PASS: Order created successfully

[TEST 15] Database statistics...
Schema | Tablename | Size
--------+-----------+------
public | materials | 40KB
...

═══════════════════════════════════════════
✓ ALL TESTS PASSED
Schema V4 is ready for production use!
═══════════════════════════════════════════
```

---

## Step 4: Manual Database Inspection

### Xem tất cả bảng
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db -c "\dt"
```

### Xem seed data - Materials
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  id, name, price_per_kg, fail_rate, default_margin
FROM materials
ORDER BY id;
EOF
```

### Xem seed data - Operational Configs
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  key, value, description
FROM operational_configs
ORDER BY key;
EOF
```

### Xem seed data - Fixed Items
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  id, name, item_type, cost
FROM fixed_items
ORDER BY id;
EOF
```

### Kiểm tra view
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
SELECT * FROM view_orders_summary;
EOF
```

---

## Step 5: Test Functions & Constraints

### Test 1: Hàm round_to_100()
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
SELECT 
  round_to_100(24950.5) AS "round_to_100(24950.5)",
  round_to_100(5000.1234) AS "round_to_100(5000.1234)",
  round_to_100(0) AS "round_to_100(0)";
EOF
```

Expected:
```
 round_to_100(24950.5) | round_to_100(5000.1234) | round_to_100(0)
-----------------------+-------------------------+-----------------
                 25000 |                    5000 |               0
```

### Test 2: Reject negative round_to_100()
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
SELECT round_to_100(-100);
EOF
```

Expected error:
```
ERROR:  LỖI HỆ THỐNG: Giá trị tài chính không được phép âm (-100)
```

### Test 3: Check constraint on fail_rate
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
-- This should FAIL (fail_rate < 1.0)
INSERT INTO materials (name, price_per_kg, fail_rate, default_margin)
VALUES ('INVALID_TEST', 100000, 0.9, 0.3);
EOF
```

Expected error:
```
ERROR:  new row for relation "materials" violates check constraint "materials_fail_rate_check"
```

### Test 4: Check constraint on default_margin
```bash
docker exec -it printcost_db_test psql -U admin -d printcost_db << EOF
-- This should FAIL (margin > 1.0)
INSERT INTO materials (name, price_per_kg, fail_rate, default_margin)
VALUES ('INVALID_TEST', 100000, 1.1, 1.5);
EOF
```

Expected error:
```
ERROR:  new row for relation "materials" violates check constraint "materials_default_margin_check"
```

---

## Step 6: Cleanup & Monitoring

### View logs
```bash
docker-compose -f docker-compose.test.yml logs db | tail -50
```

### Monitor resource usage (real-time)
```bash
docker stats printcost_db_test
```

### Stop database (keep data)
```bash
docker-compose -f docker-compose.test.yml stop
```

### Stop database (DELETE all data)
```bash
docker-compose -f docker-compose.test.yml down -v
```

---

## ✅ Checklist - Database Ready for Backend Development

- [ ] Docker/OrbStack installed and running
- [ ] `docker-compose.test.yml up -d` completes successfully
- [ ] Container is healthy: `docker ps` shows healthy status
- [ ] `bash scripts/test-db.sh` passes all 15 tests
- [ ] Seed data present: 4 materials, 2 operational configs, 6 fixed items
- [ ] Functions working: `round_to_100()`, constraints, triggers
- [ ] Connection string works: `postgres://admin:password@localhost:5432/printcost_db`

---

## 🔧 Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose -f docker-compose.test.yml logs db

# Reset (WARNING: loses data)
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

### psql command not found
```bash
# Install PostgreSQL client tools
brew install postgresql

# Then retry psql commands
```

### Permission denied errors
```bash
# Fix script permissions
chmod +x scripts/test-db.sh scripts/backup.sh scripts/setup-launchd.sh
```

### Container running but database unreachable
```bash
# Wait for database initialization (usually 15-30 seconds)
sleep 30
docker exec -it printcost_db_test pg_isready -U admin
```

---

## 📊 Expected Database Size

On Mac Mini M4:
- Empty database: ~8 MB
- With seed data: ~8.5 MB
- After 1 year of operations (100 orders/month): ~15-20 MB
- PostgreSQL overhead: ~50 MB

**Total**: Negligible impact on Mac Mini M4 storage

---

## 🚀 Next Steps

1. ✅ Database initialized & tested
2. ⏭️ Backend API development (Node.js/Go)
3. ⏭️ Frontend UI development (React/Vue)
4. ⏭️ Integration testing
5. ⏭️ Production deployment
