# 🚀 PrintCost - Database Deployment Instructions

## Quick Links
- **Database Setup Guide**: [DATABASE_SETUP.md](docs/DATABASE_SETUP.md)
- **Deployment Quick Start**: [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md)
- **Architecture**: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 📋 For Senior Dev: "Đặt nền móng vật lý trước"

Mục tiêu: Kích hoạt Database V4 Ironclad Edition trên Mac Mini M4 của bạn.

### Bước 1: Đảm bảo Environment Sẵn Sàng

```bash
# Kiểm tra Docker/OrbStack
docker ps

# Nếu lỗi: Start Docker Desktop hoặc OrbStack
# Nếu OK: Tiếp tục
```

### Bước 2: Triển khai Database Container

```bash
cd ~/Code/print-cost

# Lần đầu: Dựng database container từ scratch
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.test.yml up -d

# Chờ 15-20 giây để database khởi động
sleep 20

# Kiểm tra container running
docker ps | grep printcost_db_test
```

Expected:
```
CONTAINER ID   IMAGE                NAMES              STATUS
xxx            postgres:16-alpine   printcost_db_test  Up 15s (healthy)
```

### Bước 3: Chạy Verification Tests

```bash
# Test toàn bộ schema (15 tests)
bash scripts/test-db.sh

# Nếu tất cả pass → Database ready! ✅
# Nếu fail → Xem troubleshooting ở dưới
```

### Bước 4: Kiểm Tra Seed Data (Optional)

```bash
# Xem tất cả materials
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT name, price_per_kg, fail_rate, default_margin FROM materials;"

# Xem tất cả operational configs
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT key, value FROM operational_configs;"

# Xem tất cả fixed items
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT name, item_type, cost FROM fixed_items LIMIT 5;"
```

---

## 📊 Schema V4 Features at a Glance

| Feature | Details |
|---------|---------|
| **Database** | PostgreSQL 16 (Alpine) |
| **Functions** | 4 defensive + 2 trigger functions |
| **Tables** | 7 (materials, configs, products, orders, items) |
| **Constraints** | 25+ CHECK constraints at DB level |
| **Triggers** | 7 triggers (auto-update + ironclad locks) |
| **Views** | 1 reporting view (view_orders_summary) |
| **Seed Data** | 4 materials, 2 configs, 6 fixed items |
| **Performance** | 5 indexes on critical columns |

---

## 🛡️ Database-Level Defenses

### 1. Rounding Logic (Immutable at DB)
```sql
-- Backend MUST call round_to_100() before INSERT
-- If backend sends 24,901đ, DB rejects: "check_price_is_rounded violated"
-- Force: final_unit_price = round_to_100(final_unit_price)
```

### 2. Order Locking (Ironclad)
```sql
-- Cannot UPDATE/DELETE order if:
--   status = 'cancelled' AND is_loss_counted = TRUE
-- Prevents accidental tampering with financial records
```

### 3. Generated Columns (Auto-calculated)
```sql
-- raw_unit_cogs = SUM(raw_material_cost, raw_machine_cost, raw_labor_cost, raw_fixed_items_cost)
-- total_item_price = final_unit_price * quantity
-- Cannot be manually set = prevents drift
```

### 4. Value Validation (CHECK Constraints)
```
✓ price_per_kg > 0
✓ fail_rate >= 1.00 (hao hụt >= 0%)
✓ default_margin BETWEEN 0.00 AND 1.00 (0% to 100%)
✓ cost >= 0
✓ weight_gram > 0
✓ quantity > 0
```

---

## 🧪 Testing Database

### Verify All Functions Working

```bash
# Test 1: round_to_100() works correctly
docker exec printcost_db_test psql -U admin -d printcost_db << 'EOF'
SELECT round_to_100(24950.5) AS result;  -- Should return 25000
EOF

# Test 2: Negative values rejected
docker exec printcost_db_test psql -U admin -d printcost_db << 'EOF'
SELECT round_to_100(-100);  -- Should ERROR
EOF

# Test 3: All tables exist
docker exec printcost_db_test psql -U admin -d printcost_db -c "\dt"

# Test 4: Seed data populated
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT COUNT(*) as total_records FROM materials 
    UNION ALL SELECT COUNT(*) FROM operational_configs
    UNION ALL SELECT COUNT(*) FROM fixed_items;"
```

---

## 🔗 Backend Connection

When backend is ready, use this connection string:

```
postgresql://admin:printcost_dev_password_12345@localhost:5432/printcost_db
```

For Docker networking (container-to-container):
```
postgresql://admin:printcost_dev_password_12345@db:5432/printcost_db
```

---

## 🛠️ Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose -f docker-compose.test.yml logs db | tail -50

# Reset database
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

### Tests fail
```bash
# Re-run tests with verbose output
bash scripts/test-db.sh 2>&1 | tee test-results.log

# Check specific issue
docker exec printcost_db_test psql -U admin -d printcost_db -c "SELECT version();"
```

### psql command not found
```bash
brew install postgresql
```

---

## 📈 Next Steps

1. ✅ Database running & verified
2. 🔜 **Backend API** - Implement calculation engine
3. 🔜 Frontend UI - Order management dashboard
4. 🔜 Integration testing
5. 🔜 Production deployment

---

## 💬 Questions?

See:
- [DATABASE_SETUP.md](docs/DATABASE_SETUP.md) - Detailed setup guide
- [DEPLOYMENT_QUICK_START.md](DEPLOYMENT_QUICK_START.md) - Step-by-step deployment
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - System architecture

---

**Status**: ✅ Schema V4 Ready for Production  
**Last Updated**: June 4, 2026  
**Author**: Senior Dev + AI Co-pilot
