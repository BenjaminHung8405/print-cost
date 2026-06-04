# PrintCost - 3D Printing Management System
# Golden Baseline Architecture

**Hệ thống quản lý chi phí in 3D** dành cho xưởng in, tính toán giá vốn chính xác, giá bán tối ưu, và theo dõi lợi nhuận từng công việc in.

---

## 🎯 Quick Start (5 phút để chạy hệ thống)

### 1️⃣ Clone hoặc setup project
```bash
cd /Users/benjaminhung8405/Code/print-cost
```

### 2️⃣ Tạo file `.env` từ template
```bash
cp .env.example .env
# Mở .env và sửa password (thay \"CHANGE_ME_TO_STRONG_PASSWORD_MIN_16_CHARS\")
nano .env
```

### 3️⃣ Khởi động hệ thống (Development)
```bash
# Cách 1: Chạy tất cả services
docker-compose up -d

# Cách 2: Chạy với hot-reload (nếu có Dockerfile.dev)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

### 4️⃣ Kiểm tra services
```bash
docker ps                    # Xem các container đang chạy
docker-compose logs -f      # Xem logs realtime
```

### 5️⃣ Truy cập hệ thống
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Database Admin** (nếu có): http://localhost:5050 (pgAdmin)

---

## 📁 Cấu trúc dự án

```
print-cost/
├── backend/                 # Backend API (Node.js/Go)
│   ├── src/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── package.json
├── frontend/                # Frontend (Next.js)
│   ├── src/
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   └── package.json
├── scripts/
│   ├── init.sql            # Database schema & sample data
│   ├── backup.sh           # Backup database & volumes
│   └── setup-launchd.sh    # Cài đặt automated backup (macOS)
├── postgres_data/          # Database files (generated)
├── backups/                # Backup files (generated)
├── docker-compose.yml      # Production config
├── docker-compose.override.yml  # Development overrides
├── nginx.conf              # Reverse proxy config
├── .env.example            # Environment template
├── .env                    # Environment (local, gitignored)
├── .gitignore              # Git exclusions
└── README.md               # This file
```

---

## 🔧 Configuration Guide

### Biến môi trường (.env)

```env
# Database
DB_USER=admin
DB_PASSWORD=YOUR_SECURE_PASSWORD_MIN_16_CHARS
DB_NAME=printcost_db
DB_PORT=5432

# Application
NODE_ENV=production|development
LOG_LEVEL=info|debug

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:8080

# Backup (nếu dùng rclone)
BACKUP_REMOTE=gdrive:/printcost-backups
BACKUP_RETENTION_DAYS=30
```

### Docker Compose Modes

#### 🏭 Production Mode (Mặc định)
```bash
docker-compose -f docker-compose.yml up -d
```
- Resource limits: Có
- Health checks: Có
- Nginx reverse proxy: Có
- Hot reload: Không
- Logs: Compact (10MB max/file)

#### 💻 Development Mode (Với hot-reload)
```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up -d
```
- Hot reload source code: Có ✅
- Verbose logging: Có
- Resource limits: Không (dễ debug)
- Larger logs: 50MB max/file

---

## 📊 Database Schema

### Bảng chính

1. **materials** - Loại vật liệu (PLA, ABS, PETG, v.v.)
   ```sql
   - id, name, cost_per_kg, density, color, supplier, is_active
   ```

2. **print_jobs** - Công việc in
   ```sql
   - id, job_name, customer_id, material_id, weight_grams, print_time_minutes, status
   ```

3. **pricing** - Cấu hình giá bán
   ```sql
   - material_id, labor_cost_per_hour, material_markup_percentage, electricity_cost_per_hour
   ```

4. **invoices** - Hóa đơn bán hàng
   ```sql
   - id, invoice_number, customer_id, print_job_id, selling_price, profit, status
   ```

5. **customers** - Danh sách khách hàng
   ```sql
   - id, name, email, phone, address
   ```

### Views & Functions

- **job_cost_breakdown**: Tính chi phí chi tiết (vật liệu, nhân công, điện)
- **revenue_summary**: Tóm tắt doanh thu theo ngày
- **calculate_profit()**: Trigger tự động tính lợi nhuận

---

## 🔄 Backup & Recovery

### Manual Backup (Chạy ngay)
```bash
chmod +x scripts/backup.sh
./scripts/backup.sh
```

Output:
```
✓ Database backup: backups/db_backup_20260604_020000.sql.gz (45MB)
✓ Volume backup: backups/postgres_data_20260604_020000.tar.gz (200MB)
✓ Config backup: backups/config_20260604_020000.tar.gz (1MB)
✓ Cloud sync: ✅ synced to Google Drive
```

### Automated Backup (Daily at 2 AM)

#### Setup on macOS (Launchd)
```bash
chmod +x scripts/setup-launchd.sh
./scripts/setup-launchd.sh
```

Lệnh sau đó:
```bash
# Xem trạng thái
launchctl list com.printcost.backup

# Xem logs
tail -f ~/Library/Logs/printcost-backup-stdout.log

# Tắt/bật backup
launchctl unload ~/Library/LaunchAgents/com.printcost.backup.plist
launchctl load ~/Library/LaunchAgents/com.printcost.backup.plist

# Xóa service hoàn toàn
launchctl unload ~/Library/LaunchAgents/com.printcost.backup.plist
rm ~/Library/LaunchAgents/com.printcost.backup.plist
```

### Restore từ Backup
```bash
# 1. Stop containers
docker-compose down

# 2. Restore database
gunzip -c backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i printcost_db psql -U admin printcost_db

# 3. Restore volumes (nếu cần)
rm -rf postgres_data/
tar -xzf backups/postgres_data_YYYYMMDD_HHMMSS.tar.gz

# 4. Start containers
docker-compose up -d
```

### Cloud Sync (Optional - Google Drive)
```bash
# Install rclone
brew install rclone

# Configure Google Drive
rclone config
# Chọn: n (new remote) -> gdrive -> follow prompts

# Manual sync (lệnh backup.sh sẽ tự động làm)
rclone sync ./backups/ gdrive:/printcost-backups/ --progress
```

---

## 📊 Monitoring & Logging

### Real-time Container Stats
```bash
# Cách 1: Docker stats
docker stats

# Cách 2: ctop (lightweight container monitor)
brew install ctop
ctop

# Cách 3: OrbStack UI (nếu dùng OrbStack)
# Mở OrbStack app -> Containers
```

### View Logs
```bash
# Tất cả services
docker-compose logs -f

# Một service cụ thể
docker-compose logs -f backend
docker-compose logs -f db
docker-compose logs -f frontend

# Logs file (trên host)
tail -f backups/backup.log
tail -f ~/Library/Logs/printcost-backup-*.log
```

### Check Health
```bash
# Health check status
docker ps --format \"table {{.Names}}\t{{.Status}}\"

# Health check chi tiết
docker inspect printcost_db --format='{{json .State.Health}}'
docker inspect printcost_backend --format='{{json .State.Health}}'

# Manual health check
curl http://localhost:8080/health
curl http://localhost:80/health
```

---

## 🚀 Common Operations

### Start/Stop Services
```bash
# Start
docker-compose up -d

# Stop (giữ data)
docker-compose stop

# Stop & remove containers (nhưng giữ volumes)
docker-compose down

# Full reset (xóa cả data - ⚠️ DANGEROUS!)
docker-compose down -v
```

### View & Execute Database Queries
```bash
# Access database CLI
docker exec -it printcost_db psql -U admin -d printcost_db

# Query examples:
SELECT * FROM materials;
SELECT * FROM print_jobs WHERE status = 'completed';
SELECT * FROM revenue_summary ORDER BY date DESC LIMIT 10;
```

### Rebuild Containers
```bash
# Rebuild backend (nếu sửa Dockerfile hoặc dependencies)
docker-compose build --no-cache backend
docker-compose up -d backend

# Rebuild frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Rebuild all
docker-compose build --no-cache
docker-compose up -d
```

### Update Environment Variables
```bash
# 1. Edit .env
nano .env

# 2. Restart affected services
docker-compose up -d  # Hoặc restart cụ thể
docker-compose restart backend
```

---

## 🔐 Security Best Practices

### ✅ Checklist
- [ ] Change default DB password trong .env
- [ ] Use strong password (min 16 chars, mix of letters/numbers/symbols)
- [ ] Keep .env in .gitignore (never commit!)
- [ ] Enable backups (automated via Launchd)
- [ ] Setup Tailscale or Cloudflare Tunnels cho remote access
- [ ] Use HTTPS (generate SSL cert nếu cần)
- [ ] Regular backup verification (test restore)

### Remote Access (Safe & Secure)

#### Option 1: Tailscale (Recommended)
```bash
# Install
brew install tailscale

# Login
sudo tailscale up

# Access từ khác devices trên mạng Tailscale
# http://[machine-name]:3000
```

#### Option 2: Cloudflare Tunnel
```bash
# Install Cloudflare client
brew install cloudflare-warp

# Setup tunnel (thực hiện trên Cloudflare dashboard)
# Sau đó tunnel sẽ expose services publicly
```

---

## 🛠️ Troubleshooting

### Services không khởi động
```bash
# Check logs
docker-compose logs

# Kiểm tra port có bị chiếm không
lsof -i :3000   # Frontend
lsof -i :8080   # Backend
lsof -i :5432   # Database
lsof -i :80     # Nginx

# Kill process nếu cần
kill -9 <PID>
```

### Database connection error
```bash
# Check health
docker exec printcost_db pg_isready -U admin

# Check connection string trong backend
docker-compose logs backend | grep DATABASE_URL

# Test connection manually
docker exec printcost_db psql -U admin -d printcost_db -c \"SELECT 1;\"
```

### Out of disk space
```bash
# Check disk usage
du -sh ./postgres_data/
du -sh ./backups/

# Clean old backups manually
find ./backups/ -name \"*.gz\" -mtime +30 -delete

# Docker cleanup
docker system prune -a  # ⚠️ Deletes unused images!
```

### Performance issues
```bash
# Monitor resource usage
docker stats

# Check database slow queries
docker exec -it printcost_db psql -U admin -d printcost_db
# Inside psql:
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC;

# Increase resources in docker-compose.yml
# Tăng CPU/memory limits nếu cần
```

---

## 📚 Development Guide

### Backend Development (Node.js/Express)
```bash
cd backend
npm install
npm run dev  # Hot reload

# API endpoints mẫu:
GET  /api/health
POST /api/print-jobs
GET  /api/invoices?date=2026-06-04
POST /api/invoices
```

### Frontend Development (Next.js)
```bash
cd frontend
npm install
npm run dev  # Fast refresh

# Pages:
/                  # Dashboard
/print-jobs        # Danh sách công việc in
/invoices          # Danh sách hóa đơn
/settings/pricing  # Cấu hình giá
```

### Database Migrations (Prisma - optional)
```bash
# Nếu dùng Prisma (thay vì raw SQL)
npx prisma init
npx prisma migrate dev --name add_new_table
npx prisma studio  # GUI database explorer
```

---

## 📞 Support & Contact

Nếu có vấn đề:
1. Check logs: `docker-compose logs`
2. Check health: `curl http://localhost:8080/health`
3. Verify .env: `cat .env` (check passwords & URLs)
4. Test database: `docker exec printcost_db psql -U admin -d printcost_db -c \"SELECT 1;\"`

---

## 📄 License & Notes

- **Architecture**: Monolithic 3-Tier (Docker + Compose)
- **Target Hardware**: Mac Mini M4 (ARM64 native)
- **Backup**: Automated daily @ 2 AM (Launchd)
- **Status**: Production-Ready ✅

---

**Happy printing! 🖨️✨**
