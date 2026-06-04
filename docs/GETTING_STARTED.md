# 🚀 GETTING STARTED - 5 Phút Khởi Động PrintCost

**Hướng dẫn nhanh nhất từ 0 đến chạy hệ thống trên Mac Mini M4**

---

## ⚡ Prerequisites

- ✅ Mac Mini M4 (16GB RAM)
- ✅ Docker Desktop hoặc OrbStack đã cài
- ✅ Terminal/iTerm2
- ✅ Git (optional)

```bash
# Kiểm tra Docker đã cài
docker --version
docker ps
```

---

## 📋 Step 1: Setup Environment (1 phút)

```bash
# Vào project folder
cd /Users/benjaminhung8405/Code/print-cost

# Copy environment file
cp .env.example .env

# Edit .env - THAY ĐỔI PASSWORD thành cái mạnh (min 16 chars)
nano .env
```

**Thay đổi dòng này:**
```env
DB_PASSWORD=printcost_dev_password_12345  # ← THAY ĐỔI thành cái bạn muốn
```

---

## 🐳 Step 2: Khởi Động Services (2 phút)

### Tùy chọn A: Database chỉ (Nhanh nhất - test trước)

```bash
# Xóa container cũ (nếu có)
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# Start database
docker-compose -f docker-compose.test.yml up -d

# Chờ 15 giây cho database initialize
sleep 15

# Kiểm tra container running
docker ps | grep printcost_db_test
```

**Expected output:**
```
CONTAINER ID   IMAGE                NAMES              STATUS
abc123xyz      postgres:16-alpine   printcost_db_test  Up 15s (healthy)
```

### Tùy chọn B: Full Stack (Khi backend/frontend sẵn sàng)

```bash
# Start tất cả services
docker-compose up -d

# Chờ 20 giây
sleep 20

# Kiểm tra
docker ps
```

---

## ✅ Step 3: Xác Minh Setup (1 phút)

### Verify Database

```bash
# Chạy test script
bash scripts/test-db.sh
```

**Expected output cuối cùng:**
```
═══════════════════════════════════════════
✓ ALL TESTS PASSED (15/15)
Schema V4 is ready for production use!
═══════════════════════════════════════════
```

### Kiểm tra Services (Full Stack)

```bash
# Xem logs realtime
docker-compose logs -f

# Hoặc kiểm tra từng service
curl http://localhost:8080/health      # Backend
curl http://localhost:3000             # Frontend
curl http://localhost:80/health        # Nginx
```

---

## 📊 Step 4: Xem Dữ Liệu (1 phút)

### Kiểm tra Seed Data

```bash
# Xem tất cả materials
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT name, price_per_kg, fail_rate FROM materials;"

# Xem configs
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT key, value FROM operational_configs;"

# Xem fixed items
docker exec printcost_db_test psql -U admin -d printcost_db -c \
  "SELECT name, item_type, cost FROM fixed_items LIMIT 5;"
```

---

## 🔄 Step 5: Setup Automated Backups (1 phút - Optional)

```bash
# Make scripts executable
chmod +x scripts/backup.sh scripts/setup-launchd.sh

# Test manual backup
./scripts/backup.sh

# Setup daily backups at 2 AM
./scripts/setup-launchd.sh
```

---

## 🎯 Done! ✅

Bây giờ bạn đã có:
- ✅ Database với schema V4 (7 tables, 4 functions, triggers)
- ✅ Seed data ready (4 materials, 8 fixed items, 2 configs)
- ✅ Automated backups (nếu setup)
- ✅ Backend + Frontend (khi bạn tạo)

---

## 📚 Tiếp Theo

Đọc thêm:
- **[docs/DATABASE.md](DATABASE.md)** - Database chi tiết (schema, functions, constraints)
- **[docs/ARCHITECTURE.md](ARCHITECTURE.md)** - System design & technical decisions
- **[docs/DEPLOYMENT.md](DEPLOYMENT.md)** - Full deployment & operations guide

---

## 🆘 Quick Troubleshooting

### Container không khởi động
```bash
docker-compose -f docker-compose.test.yml logs db | tail -20
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d
```

### Database không kết nối được
```bash
# Chờ thêm vài giây
sleep 30

# Kiểm tra lại
docker exec printcost_db_test pg_isready -U admin
```

### psql command not found
```bash
brew install postgresql
```

---

## 📞 Lệnh Hay Dùng

```bash
# Xem logs
docker-compose logs -f

# Stop (giữ data)
docker-compose stop

# Down (xóa containers, giữ data)
docker-compose down

# Full reset (⚠️ XÓA tất cả data)
docker-compose down -v

# Monitor resources
docker stats

# Access database
docker exec -it printcost_db_test psql -U admin -d printcost_db
```

---

**Xong rồi! Bạn đã sẵn sàng.**
