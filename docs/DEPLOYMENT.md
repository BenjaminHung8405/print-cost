# DEPLOYMENT & OPERATIONS GUIDE

Hướng dẫn triển khai PrintCost trên Mac Mini M4 - **Production Ready**

---

## 🎯 Pre-Deployment Checklist

### ✅ System Requirements
- [ ] Mac Mini M4 (Base model: 10-core CPU, 10-core GPU, 16GB RAM)
- [ ] macOS 12+ (với Docker hoặc OrbStack)
- [ ] At least 100GB free disk space (PostgreSQL + backups)
- [ ] Stable network connection

### ✅ Software Setup
- [ ] Docker Desktop hoặc OrbStack installed
- [ ] Git installed
- [ ] Node.js 18+ (cho dev, không cần cho container)
- [ ] rclone installed (cho cloud backup)

### ✅ Configuration Files
- [ ] `.env` copied from `.env.example` với password mạnh
- [ ] `docker-compose.yml` reviewed
- [ ] `nginx.conf` reviewed
- [ ] `scripts/init.sql` reviewed (database schema)

### ✅ Security
- [ ] Strong DB password (min 16 chars) ✅
- [ ] `.env` added to `.gitignore` ✅
- [ ] Backup strategy tested ✅
- [ ] Remote access (Tailscale/Cloudflare) planned ✅

---

## 🚀 Step-by-Step Deployment

### Step 1: Initial Setup
```bash
cd /Users/benjaminhung8405/Code/print-cost

# Clone & setup
git clone <repo> . # hoặc setup từ existingfolder

# Create .env
cp .env.example .env
nano .env  # Edit password

# Make scripts executable
chmod +x scripts/backup.sh scripts/setup-launchd.sh
```

### Step 2: Start Services
```bash
# Production start (recommended)
docker-compose up -d

# Wait for database to be ready
sleep 10

# Check all containers running
docker ps
```

Expected output:
```
CONTAINER ID   IMAGE                NAMES              STATUS
xxxxx          postgres:16-alpine   printcost_db       Up 10s (healthy)
xxxxx          nginx:alpine         printcost_nginx    Up 10s
xxxxx          node:alpine          printcost_backend  Up 10s (health: starting)
xxxxx          node:alpine          printcost_frontend Up 10s
```

### Step 3: Verify Services
```bash
# Check health endpoints
curl http://localhost:80/health        # Nginx
curl http://localhost:8080/health      # Backend
curl http://localhost:3000             # Frontend (should return HTML)

# Check database
docker exec printcost_db psql -U admin -d printcost_db -c \"SELECT COUNT(*) FROM materials;\"
```

### Step 4: Setup Automated Backups
```bash
# Configure Launchd (macOS only)
./scripts/setup-launchd.sh

# Verify
launchctl list com.printcost.backup

# Test manual backup
./scripts/backup.sh
```

### Step 5: (Optional) Setup Cloud Backup
```bash
# Install rclone
brew install rclone

# Configure Google Drive
rclone config
# Follow prompts to authenticate with Google

# Test sync
rclone ls gdrive:/
```

### Step 6: (Optional) Setup Remote Access
```bash
# Option A: Tailscale (Recommended)
brew install tailscale
sudo tailscale up
# Xem IP: tailscale ip -4

# Option B: Cloudflare Tunnel
brew install cloudflare-warp
# Configure in Cloudflare dashboard
```

---

## 🔄 Post-Deployment Verification

### Week 1: Monitoring
```bash
# Daily checks
docker-compose logs -f              # Monitor logs
docker stats                        # Resource usage
ctop                               # Container monitor

# Weekly backup verification
ls -lh backups/                    # Check backup files
# Verify recent backup exists and has reasonable size
```

### Performance Baseline
```bash
# Record baseline
docker stats > baseline.txt

# Expected on Mac Mini M4:
# - Frontend: <200MB RAM, <5% CPU idle
# - Backend: <300MB RAM, <10% CPU idle
# - Database: <500MB RAM, <5% CPU idle
# - Nginx: <50MB RAM, <1% CPU
```

---

## 📅 Maintenance Schedule

### Daily (Automated)
- ✅ Backup database (2 AM via Launchd)
- ✅ Rotate old backups (keep 30 days)
- ✅ Cloud sync if configured

### Weekly
- [ ] Review backup logs: `tail -n 50 backups/backup.log`
- [ ] Check disk usage: `du -sh postgres_data/ backups/`
- [ ] Monitor logs for errors: `docker-compose logs --tail=1000 | grep ERROR`

### Monthly
- [ ] Full system verification
- [ ] Test restore procedure (restore từ backup)
- [ ] Review database size & performance
- [ ] Update Docker images (if needed)

### Quarterly
- [ ] Database optimization
- [ ] Review & update pricing rules
- [ ] Capacity planning (disk, memory)
- [ ] Security audit

---

## � Capacity Planning & Storage Optimization

### Nhận định chính xác! 

Đối với một ứng dụng quy mô cá nhân, dùng nội bộ tại xưởng và không publish ra ngoài, dung lượng database tiêu tốn sẽ **cực kỳ ít**.

#### 1. Tính toán dung lượng thực tế (Dữ liệu text thuần)

Trong database quan hệ (PostgreSQL), một dòng dữ liệu (record) chứa thông tin sản phẩm hoặc đơn hàng của bạn chỉ tốn trung bình từ **100 Bytes đến 500 Bytes**.

**Phóng đại (Worst-case scenario) cho nhu cầu sử dụng trong vài năm:**

* **Bảng cấu hình nhựa & chi phí:** ~20 dòng ≈ 10 KB
* **Bảng danh mục sản phẩm (Mẫu thiết kế):** Khoảng 500 mẫu ≈ 250 KB
* **Bảng đơn hàng + Chi tiết đơn hàng:** 
  - Giả sử tối đa 10 đơn hàng/ngày
  - Một năm có 3.650 đơn
  - 3.650 đơn × 500 Bytes ≈ 1.8 MB/năm

> 📊 **Tổng kết:** Toàn bộ dữ liệu số và text thuần mà bạn lưu trữ trong **3 đến 5 năm** chỉ chiếm khoảng **10 MB đến 50 MB**. Con số này chỉ bằng dung lượng của một bài hát MP3 hoặc vài bức ảnh chụp từ điện thoại.

#### 2. Các yếu tố "ngầm" làm tăng dung lượng Database

Mặc dù dữ liệu nhập vào rất ít, hệ thống sẽ tốn thêm dung lượng cho:

1. **Hệ điều hành thu nhỏ của Database (PostgreSQL Engine):** 
   - Container `postgres:16-alpine` chiếm khoảng **300 MB**

2. **Cơ chế Log ghi nhật ký (Write-Ahead Logging - WAL):** 
   - PostgreSQL giữ lại khoảng **1 GB** file đệm (có thể cấu hình giảm xuống)
   - Cơ chế này ngăn mất dữ liệu khi mất điện đột ngột

3. **Hình ảnh đính kèm (⚠️ Lưu ý quan trọng):** 
   - **KHÔNG lưu trực tiếp file ảnh sản phẩm vào PostgreSQL** (Blob/Base64)
   - Nếu cần chụp ảnh hoặc lưu file G-code/STL, lưu file vào **Local Storage** (thư mục riêng trên Mac)
   - Chỉ lưu **đường dẫn URL** của ảnh vào database
   - Nếu không theo khuyến cáo, dung lượng sẽ tăng lên rất nhanh (vài GB đến vài chục GB)

#### 3. Khuyến nghị cấu hình từ Senior Dev

Để tối ưu hóa không gian cho Mac Mini M4 16GB:

**✅ Không lưu file nặng vào DB**
```
Tuyệt đối không lưu trực tiếp file ảnh sản phẩm vào trong PostgreSQL.
→ Lưu file ảnh ra thư mục riêng trên ổ cứng Mac (Local Storage)
→ Chỉ lưu đường dẫn (URL) của ảnh vào database
```

**Ví dụ cấu trúc:**
```yaml
# docker-compose.yml
volumes:
  - ./uploads:/app/uploads  # Ảnh lưu ngay trên Mac, nhìn thấy được
```

**Nginx serve trực tiếp:**
```nginx
location /uploads/ {
  alias /app/uploads/;
}
```

**Database chỉ lưu:**
```sql
INSERT INTO products (name, image_url) 
VALUES ('Product A', '/uploads/product-001.jpg');
```

**✅ Cài đặt giới hạn tài nguyên:**
- Giới hạn dung lượng ổ cứng cấp cho Postgres: **tối đa 2 GB đến 5 GB**
- Bạn đã có thể xài "thả ga" trong vòng **5-10 năm tới** mà không cần suy nghĩ

#### 4. Ước tính chi tiết theo thời gian

| Timeframe | Database Size | WAL Logs | Total | Notes |
|-----------|---|---|---|---|
| 1 năm | 2-5 MB | 1 GB | ~1 GB | Chủ yếu là WAL, dữ liệu rất ít |
| 3 năm | 6-15 MB | 1 GB | ~1 GB | WAL tự rotate, không accumulate |
| 5 năm | 10-25 MB | 1 GB | ~1 GB | Vẫn chỉ ~1% dung lượng đơn |
| 10 năm | 20-50 MB | 1 GB | ~1 GB | Hoàn toàn an toàn |
| +Ảnh (mỗi ảnh 2MB) | 2-5 MB | 1 GB | 2-5 GB | Nếu 1000 ảnh sản phẩm |

**📌 Kết luận:** Vấn đề dung lượng đã được giải quyết triệt để. Bước tiếp theo là **Thiết kế chi tiết các bảng Database (Schema)** để hiện thực hóa các công thức tính giá vốn và giá bán từ file Excel.

---

## �🔧 Troubleshooting Guide

### Issue: Services won't start
```bash
# Step 1: Check logs
docker-compose logs

# Step 2: Check ports in use
lsof -i :80 && lsof -i :8080 && lsof -i :5432

# Step 3: Check disk space
df -h

# Step 4: Restart Docker
# OrbStack: Quit & reopen app
# Docker Desktop: Quit & reopen app
```

### Issue: Database slow or unresponsive
```bash
# Check connections
docker exec printcost_db psql -U admin -d printcost_db -c \"SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;\"

# Check slow queries
docker exec -it printcost_db psql -U admin -d printcost_db
# Inside psql:
SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
\\q

# Restart database
docker-compose restart db
# Wait: sleep 10
```

### Issue: Backup failed
```bash
# Check backup logs
tail -f backups/backup.log

# Verify database is healthy
docker exec printcost_db pg_isready -U admin

# Run manual backup with verbose output
./scripts/backup.sh 2>&1 | tail -50

# Check disk space
df -h ./backups/
```

### Issue: Out of disk space
```bash
# Check what's taking space
du -sh ./* | sort -hr

# Clean old backups
find ./backups/ -name \"*.gz\" -mtime +30 -delete

# Or manually keep recent backups only
ls -lt ./backups/*.gz | tail -n +4 | awk '{print $NF}' | xargs rm

# Docker cleanup (use carefully!)
docker system prune  # Remove unused containers/images
docker volume prune  # Remove unused volumes
```

### Issue: High CPU/Memory usage
```bash
# Monitor which service uses most
docker stats

# If backend is high:
docker-compose logs backend | tail -50  # Check for errors
docker-compose restart backend

# If database is high:
docker exec -it printcost_db psql -U admin -d printcost_db
# Inside: EXPLAIN ANALYZE <slow_query>;
\\q

# Increase resource limits in docker-compose.yml
# Restart: docker-compose up -d
```

---

## 💾 Backup & Restore Procedures

### Regular Backup (Automated)
**Runs daily at 2 AM via Launchd**
```bash
# View backup location
ls -lh /Users/benjaminhung8405/Code/print-cost/backups/

# View backup logs
tail -f /Users/benjaminhung8405/Code/print-cost/backups/backup.log
```

### Manual Backup (Anytime)
```bash
./scripts/backup.sh

# Backups created:
# - db_backup_YYYYMMDD_HHMMSS.sql.gz     (Database dump)
# - postgres_data_YYYYMMDD_HHMMSS.tar.gz (Data volume)
# - config_YYYYMMDD_HHMMSS.tar.gz        (Configuration)
```

### Restore Procedure (Full Recovery)
```bash
# 1. Stop services
docker-compose stop

# 2. Restore database
# Find latest backup
ls -lt backups/db_backup*.sql.gz | head -1

# Restore (example)
gunzip -c backups/db_backup_20260604_020000.sql.gz | \\
  docker exec -i printcost_db psql -U admin printcost_db

# 3. Restore data volume (if needed)
rm -rf postgres_data/
tar -xzf backups/postgres_data_20260604_020000.tar.gz

# 4. Verify
docker exec printcost_db pg_isready -U admin

# 5. Start services
docker-compose up -d
```

### Backup to External Drive
```bash
# Attach external USB drive
# Mount at: /Volumes/ExternalDrive

# Copy backups
cp -r ./backups /Volumes/ExternalDrive/PrintCost_Backups

# Eject
diskutil eject /Volumes/ExternalDrive
```

---

## 🔐 Security Hardening

### Network Security
```bash
# View port bindings
docker ps --format \"table {{.Names}}\t{{.Ports}}\"

# Nginx is the only exposed port (80/443)
# Database & Backend are internal only
# This is correct ✅
```

### Database Access
```bash
# Database should NOT be accessible from outside
# Verify by checking docker-compose.yml:
cat docker-compose.yml | grep -A5 \"db:\"
# Should only have local port bindings

# If need remote access, use SSH tunnel:
ssh -L 5432:db:5432 user@remote-host
psql -h localhost -U admin -d printcost_db
```

### Environment Secrets
```bash
# Keep .env secure
chmod 600 .env
ls -la .env  # Should show rw------- (600 permissions)

# Never commit .env
cat .gitignore | grep .env  # Should include .env

# Rotate secrets periodically
# 1. Change DB password in .env
# 2. Update database user: ALTER USER admin WITH PASSWORD 'newpass';
# 3. Restart backend: docker-compose restart backend
```

### Access Control
```bash
# Create separate database user for backend (optional)
docker exec -it printcost_db psql -U admin

# Inside psql:
CREATE USER printcost_api WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE printcost_db TO printcost_api;
GRANT USAGE ON SCHEMA public TO printcost_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO printcost_api;
```

---

## 📊 Monitoring Commands

### Real-time Monitoring
```bash
# Option 1: Docker native
docker stats

# Option 2: ctop (more compact)
ctop

# Option 3: OrbStack UI
# Mở OrbStack app -> Containers tab
```

### Log Analysis
```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Only errors
docker-compose logs | grep ERROR

# From specific service
docker-compose logs -f backend

# With timestamps
docker-compose logs -f --timestamps
```

### Health Checks
```bash
# Container health status
docker ps --format \"table {{.Names}}\t{{.Status}}\"

# Detailed health
docker inspect printcost_db --format='{{json .State.Health}}' | jq

# Manual health tests
curl http://localhost:80/health
curl http://localhost:8080/health
curl http://localhost:3000
```

---

## 🆘 Emergency Procedures

### Service is Down
```bash
# Step 1: Verify
docker ps | grep printcost

# Step 2: Check logs
docker-compose logs --tail=100

# Step 3: Restart
docker-compose restart <service>

# Step 4: If still down, full restart
docker-compose down
sleep 5
docker-compose up -d
```

### Database Corruption
```bash
# Verify integrity
docker exec printcost_db pg_verify_checksums -D /var/lib/postgresql/data

# If corrupt, restore from backup
# Follow: ### Restore Procedure (Full Recovery) above
```

### Data Loss
```bash
# Check available backups
ls -la backups/

# Restore latest
gunzip -c backups/db_backup_<latest>.sql.gz | \\
  docker exec -i printcost_db psql -U admin printcost_db
```

### Complete System Reset (⚠️ DESTRUCTIVE)
```bash
# This WILL delete all data!
docker-compose down -v

# Restart
docker-compose up -d

# Database will be recreated from init.sql with sample data
```

---

## 📝 Documentation

### Important Files
- **README.md**: General setup & usage
- **DEPLOYMENT.md**: This file - deployment & operations
- **docker-compose.yml**: Production configuration
- **docker-compose.override.yml**: Development overrides
- **nginx.conf**: Reverse proxy configuration
- **scripts/init.sql**: Database schema & initial data
- **scripts/backup.sh**: Backup automation script
- **.env.example**: Environment variables template

### Key Commands Quick Reference
```bash
# Start/Stop
docker-compose up -d        # Start all services
docker-compose down         # Stop all services

# Logs & Monitoring
docker-compose logs -f      # View logs
docker stats                # Resource usage
ctop                       # Container monitor

# Backup
./scripts/backup.sh        # Manual backup
./scripts/setup-launchd.sh # Setup automated backup

# Database
docker exec -it printcost_db psql -U admin -d printcost_db

# Rebuild
docker-compose build --no-cache
docker-compose up -d

# Clean
docker system prune -a     # ⚠️ Careful with this!
```

---

## 📞 Support Checklist

If something goes wrong:

1. ✅ Check logs: `docker-compose logs`
2. ✅ Check health: `curl http://localhost:8080/health`
3. ✅ Check disk: `df -h`
4. ✅ Check containers: `docker ps`
5. ✅ Check processes: `docker stats`
6. ✅ Restart if needed: `docker-compose restart`
7. ✅ Check backups: `ls -lh backups/`
8. ✅ Review .env: confirm password & URLs
9. ✅ Check firewall: ensure ports accessible (80, 443)
10. ✅ Test restore: verify backup integrity

---

**PrintCost is Production Ready! 🚀**
