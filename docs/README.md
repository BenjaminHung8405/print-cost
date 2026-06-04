# 📚 PrintCost - Hướng dẫn & Tài liệu Kỹ thuật Chi tiết

Hệ thống quản lý chi phí in 3D (Self-hosted) được thiết kế cho xưởng in nhỏ/vừa, vận hành trên Mac Mini M4 sử dụng Docker Compose.

---

## 📋 MỤC LỤC
1. [⚡ Hướng dẫn Nhanh (Quick Start)](#-hướng-dẫn-nhanh-quick-start)
2. [📐 Kiến trúc Hệ thống (System Architecture)](#-kiến-trúc-hệ-thống-system-architecture)
3. [🗄️ Database Schema & Bảo vệ mức DB (Database & Security)](#-database-schema--bảo-vệ-mức-db-database--security)
4. [🚀 Vận hành & Bảo trì (Operations & Maintenance)](#-vận-hành--bảo-trì-operations--maintenance)
5. [🆘 Xử lý Sự cố & Troubleshooting](#-xử-lý-sự-cố--troubleshooting)

---

## ⚡ Hướng dẫn Nhanh (Quick Start)

### Yêu cầu hệ thống (Prerequisites)
- ✅ **Phần cứng**: Mac Mini M4 (Khuyến nghị 16GB RAM) hoặc các máy Mac/Linux tương tự.
- ✅ **Phần mềm**: Docker Desktop hoặc OrbStack đã cài đặt và đang chạy.
- ✅ **Công cụ**: Terminal/iTerm2.

```bash
# Kiểm tra Docker đã cài đặt thành công
docker --version
docker ps
```

### Bước 1: Setup Environment (1 phút)
```bash
# Truy cập thư mục dự án
cd /Users/benjaminhung8405/Code/print-cost

# Sao chép file cấu hình môi trường
cp .env.example .env

# Sửa .env để cấu hình DB_PASSWORD bảo mật (tối thiểu 16 ký tự)
nano .env
```
*Hãy thay đổi dòng sau trong `.env`:*
```env
DB_PASSWORD=printcost_dev_password_12345  # ← Đổi thành mật khẩu mạnh của bạn
```

### Bước 2: Khởi động Services (2 phút)
Hệ thống hỗ trợ 2 chế độ khởi chạy tùy thuộc vào nhu cầu:

#### Tùy chọn A: Chỉ khởi động Database (Nhanh nhất - để kiểm tra schema & phát triển)
```bash
# Dọn dẹp container test cũ (nếu có)
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# Khởi động DB test
docker-compose -f docker-compose.test.yml up -d

# Đợi 15 giây cho database khởi tạo hoàn tất
sleep 15

# Kiểm tra container đang chạy
docker ps | grep printcost_db_test
```

#### Tùy chọn B: Khởi động Full Stack (Khi có đầy đủ Backend và Frontend)
```bash
# Khởi động toàn bộ stack
docker-compose up -d

# Đợi 20 giây cho các services khởi chạy ổn định
sleep 20

# Kiểm tra trạng thái các container
docker ps
```

### Bước 3: Xác minh Setup (1 phút)
Chạy script kiểm tra để xác minh cấu trúc database:
```bash
bash scripts/test-db.sh
```
Nếu thành công, bạn sẽ thấy kết quả:
```text
✓ ALL TESTS PASSED (15/15)
Schema V4 is ready for production use!
```

Đối với tùy chọn Full Stack, bạn có thể kiểm tra trực tiếp các cổng dịch vụ:
```bash
curl http://localhost:8080/health      # Backend API (Port 8080)
curl http://localhost:3000             # Frontend UI (Port 3000)
curl http://localhost:80/health        # Nginx Reverse Proxy (Port 80)
```

---

## 📐 Kiến trúc Hệ thống (System Architecture)

PrintCost được xây dựng theo mô hình **Monolithic 3-Tier Architecture** tự vận hành (Self-hosted) và chạy hoàn toàn trên container Docker.

### Sơ đồ luồng dữ liệu (Data Flow)
```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT DEVICES (Desktop, Tablet, Mobile)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS (Port 80/443)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  NGINX REVERSE PROXY (nginx:80)                              │
│  - Điều hướng requests (/api -> Backend, / -> Frontend)      │
│  - Nén phản hồi (gzip) & lưu cache file tĩnh                 │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
       PORT 3000                       PORT 8080
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│  FRONTEND (Next.js)  │      │  BACKEND (Node.js)   │
│  - Render UI & State │      │  - Xử lý nghiệp vụ   │
│  - Responsive Layout │      │  - Tính chi phí & giá│
└──────────────────────┘      └──────────┬───────────┘
                                         │ PORT 5432 (Internal Only)
                                         ▼
                        ┌──────────────────────────────┐
                        │  PostgreSQL (postgres:16)    │
                        │  - Schema, Functions, Triggers│
                        └──────────────────────────────┘
```

### Chi tiết các Container & Phân bổ Tài nguyên (16GB RAM Mac Mini M4)
Mỗi service được cấu hình giới hạn cứng tài nguyên (Resource Limits) để đảm bảo độ ổn định và không làm nghẽn hệ điều hành chính của Mac Mini:

| Service | Công nghệ | Cổng (Internal) | Truy cập bên ngoài | Giới hạn Tài nguyên (Limits) |
|---|---|---|---|---|
| **nginx** | Nginx Alpine | 80 / 443 | Có (HTTP/S) | 0.5 CPU, 256MB RAM |
| **frontend** | Next.js (React + TS) | 3000 | Không (Qua proxy) | 2.0 CPU, 2GB RAM |
| **backend** | Node.js (Express/Nest) | 8080 | Không (Qua proxy) | 4.0 CPU, 4GB RAM |
| **db** | PostgreSQL 16 Alpine | 5432 | Không (Chỉ nội bộ) | 2.0 CPU, 2GB RAM |

> [!IMPORTANT]
> Mạng nội bộ (Docker Network) được thiết lập bảo mật tuyệt đối. Database (`db`) và Backend (`backend`) không mở bất cứ port nào ra mạng ngoài. Mọi truy cập bắt buộc phải đi qua Nginx reverse proxy ở cổng `80/443`.

---

## 🗄️ Database Schema & Bảo vệ mức DB (Database & Security)

Hệ thống sử dụng PostgreSQL 16 với schema cấu trúc chặt chẽ (Schema V4 Ironclad).

### 1. Cấu trúc bảng (7 Tables)
1. `materials`: Lưu trữ thông tin cuộn nhựa (PLA, ABS, PETG...) gồm đơn giá/kg, tỉ lệ hao hụt (`fail_rate`), margin mặc định.
2. `operational_configs`: Các cấu hình chi phí vận hành chung (ví dụ: tiền điện/giờ, khấu hao máy in).
3. `fixed_items`: Các khoản chi phí cố định (mặt bằng, phần mềm, internet...).
4. `products`: Thông tin sản phẩm/mẫu in.
5. `product_fixed_items`: Liên kết chi phí cố định phân bổ cho từng sản phẩm.
6. `orders`: Thông tin đơn hàng (trạng thái, ngày tạo, tổng doanh thu/chi phí).
7. `order_items`: Chi tiết từng sản phẩm trong đơn hàng.

### 2. Cơ chế bảo vệ dữ liệu tự động (DB-Level Defenses)
- **Hàm làm tròn tài chính `round_to_100()`**: Bảo vệ số tiền không bị lẻ dưới 100đ (đơn vị nhỏ nhất của VND). Hệ thống sẽ báo lỗi nếu insert số âm hoặc số tiền không làm tròn.
- **Khóa đơn hàng `enforce_order_lock()`**: Trực tiếp khóa đơn hàng ở mức DB (ngăn chặn UPDATE/DELETE) khi đơn hàng đã chuyển trạng thái `cancelled` và `is_loss_counted = TRUE` để phục vụ đối soát tài chính.
- **Calculated Columns (Cột tự tính toán)**: Các cột như giá vốn (`raw_unit_cogs`) hay tổng tiền (`total_item_price`) được tính tự động tại DB, tránh sai lệch logic giữa Backend và Database.
- **CHECK Constraints**: Hơn 25 ràng buộc kiểm tra đầu vào (ví dụ: `fail_rate >= 1.0`, `price_per_kg > 0`, `quantity > 0`).
- **Auto-Updated Timestamps**: Tất cả các bảng đều tích hợp trigger tự động cập nhật trường `updated_at` mỗi khi có thay đổi dữ liệu, ứng dụng backend không cần cập nhật thủ công.

---

## 🚀 Vận hành & Bảo trì (Operations & Maintenance)

### 💾 Quy trình Sao lưu & Phục hồi (Backups)

#### Tự động Sao lưu hàng ngày (Launchd)
Script tự động chạy vào lúc 2:00 sáng hàng ngày để sao lưu DB, thư mục data và file cấu hình:
```bash
# Phân quyền thực thi cho script
chmod +x scripts/backup.sh scripts/setup-launchd.sh

# Cài đặt tự động chạy hàng ngày
./scripts/setup-launchd.sh
```

#### Sao lưu thủ công (Manual Backup)
```bash
./scripts/backup.sh
```
File sao lưu sẽ được lưu tại thư mục `backups/` dưới dạng file nén:
- `db_backup_YYYYMMDD_HHMMSS.sql.gz` (Bản dump SQL database)
- `postgres_data_YYYYMMDD_HHMMSS.tar.gz` (Nén volume database)
- `config_YYYYMMDD_HHMMSS.tar.gz` (Cấu hình hệ thống .env, docker-compose)

#### Quy trình Phục hồi (Restore)
```bash
# 1. Dừng các dịch vụ
docker-compose stop

# 2. Khôi phục schema & dữ liệu database từ file backup
gunzip -c backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i printcost_db psql -U admin printcost_db

# 3. Khôi phục folder data nếu cần thiết
rm -rf postgres_data/
tar -xzf backups/postgres_data_YYYYMMDD_HHMMSS.tar.gz

# 4. Khởi động lại stack
docker-compose up -d
```

### 📊 Hoạch định Dung lượng & Lưu trữ (Capacity Planning)
Đối với ứng dụng nội bộ nhỏ, dung lượng dữ liệu thuần (text & số) chiếm dụng **rất ít**:
* Một record đơn hàng chỉ tốn khoảng 100 - 500 Bytes.
* Giả sử xưởng in chạy 10 đơn hàng/ngày, tổng lượng dữ liệu tăng thêm trong 5 năm chỉ khoảng **10 MB - 50 MB**.
* Thư mục database engine Postgres chiếm ~300 MB ban đầu.
* File đệm WAL logs của Postgres chiếm ~1 GB và tự động xoay vòng (rotate).

> [!WARNING]
> **Không lưu trữ file ảnh sản phẩm trực tiếp dưới dạng Base64/Blob trong Database.** 
> Hãy lưu file ảnh vật lý vào ổ đĩa Mac (map qua volume `./uploads` của docker) và chỉ lưu **đường dẫn URL** (ví dụ `/uploads/image-001.png`) trong Database. Việc này giúp giữ kích thước DB siêu nhẹ và truy xuất ảnh cực nhanh qua Nginx.

---

## 🆘 Xử lý Sự cố & Troubleshooting

### 1. Lệnh Giám sát nhanh
```bash
docker-compose logs -f            # Log của tất cả services theo thời gian thực
docker-compose logs -f backend    # Chỉ xem log của Backend container
docker-compose logs | grep ERROR  # Tìm nhanh các dòng ghi lỗi
docker stats                      # Theo dõi tài nguyên (CPU, RAM) thời gian thực
ctop                              # Công cụ giám sát container trực quan
```

### 2. Các lỗi thường gặp & Cách khắc phục

#### Cổng kết nối bị chiếm dụng (Container không start được)
```bash
# Kiểm tra xem cổng 80, 8080 hoặc 5432 có đang bị app khác trên Mac chiếm dụng không
lsof -i :80
lsof -i :8080
lsof -i :5432

# Hãy tắt ứng dụng đang chiếm dụng, hoặc thay đổi port bên trái trong docker-compose.yml
# Sau đó khởi động lại:
docker-compose down
docker-compose up -d
```

#### Không kết nối được Database
```bash
# Kiểm tra trạng thái sẵn sàng của Database
docker exec printcost_db pg_isready -U admin

# Nếu báo lỗi hoặc chưa sẵn sàng, hãy đợi thêm 15-30 giây hoặc kiểm tra log DB:
docker-compose logs db | tail -50
```

#### Hết dung lượng ổ cứng (Out of disk space)
```bash
# Kiểm tra dung lượng thư mục hiện tại
du -sh ./* | sort -hr

# Dọn dẹp các container/images cũ không sử dụng (Lưu ý: Không dùng tùy chọn xóa volume -v nếu muốn giữ data)
docker system prune -a
```

#### Lỗi thiếu lệnh `psql` trên máy Mac để chạy script
```bash
# Cài đặt qua Homebrew
brew install postgresql
```

#### Khôi phục hoàn toàn về trạng thái ban đầu (⚠️ XÓA SẠCH DỮ LIỆU)
```bash
# Dừng và xóa toàn bộ dữ liệu lưu trữ
docker-compose down -v

# Khởi chạy lại từ đầu (Database sẽ tự động chạy lại init.sql)
docker-compose up -d
```
