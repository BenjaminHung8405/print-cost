# PRINTCOST - SYSTEM ARCHITECTURE & DESIGN DECISIONS

**Golden Baseline Architecture for Self-Hosted 3D Printing Management System on Mac Mini M4**

---

## 🎯 Executive Summary

PrintCost là hệ thống quản lý chi phí in 3D được thiết kế cho xưởng in nhỏ/vừa, triển khai trên Mac Mini M4 thông qua Docker Compose. Kiến trúc tuân theo **Monolithic 3-Tier Architecture** nhưng được đóng gói hoàn toàn trong containers, cho phép triển khai nhanh, backup dễ dàng, và không yêu cầu maintenance phức tạp.

### Key Characteristics
- ✅ **Production-Ready**: Health checks, resource limits, logging
- ✅ **Self-Hosted**: Không cần cloud provider, dữ liệu ở local
- ✅ **Low Overhead**: 16GB RAM đủ cho tất cả (frontend, backend, database)
- ✅ **ARM64 Native**: Tối ưu cho M4 chip architecture
- ✅ **Automated Backup**: Daily backups via Launchd
- ✅ **Developer Friendly**: Hot-reload support, clear separation dev/prod

---

## 📐 Architecture Layers

### 1. PRESENTATION LAYER (Frontend)

**Technology**: Next.js (React + TypeScript)

**Responsibilities**:
- Responsive web UI cho desktop/tablet/mobile
- Real-time dashboard hiển thị doanh số, lợi nhuận
- Forms để nhập công việc in, tạo hóa đơn
- Charts & analytics (doanh thu, margin trend)

**Port**: 3000 (internal), exposed via Nginx:80/443

**Resource Allocation**:
```yaml
limits:
  cpus: '2'
  memory: 2G
reservations:
  cpus: '1'
  memory: 1G
```

**Why Next.js?**
- Server-side rendering (SSR) tốt cho SEO
- Fast refresh (instant feedback khi dev)
- Built-in API routes (nếu cần)
- Edge optimization cho M4 (small bundle)

---

### 2. APPLICATION LAYER (Backend)

**Technology**: Node.js with Express/NestJS (TypeScript)

**Responsibilities**:
- REST API endpoints để frontend gọi
- Business logic: tính chi phí, giá bán, lợi nhuận
- Authentication & authorization (nếu cần)
- Data validation & error handling
- Integration với database

**Port**: 8080 (internal), exposed via Nginx only

**Resource Allocation**:
```yaml
limits:
  cpus: '4'
  memory: 4G
reservations:
  cpus: '2'
  memory: 2G
```

**Why Node.js?**
- Fast development iteration
- Great ecosystem (Express, TypeScript)
- Native async/await cho I/O heavy operations
- ARM64 image readily available
- Good performance on M4

**API Design Pattern**: RESTful with JSON
```
POST   /api/print-jobs              Create new job
GET    /api/print-jobs/:id          Get job details
GET    /api/print-jobs?status=...   List jobs with filters
POST   /api/invoices                Create invoice
GET    /api/revenue/summary?date=.. Revenue analytics
```

---

### 3. DATA ACCESS LAYER (Database)

**Technology**: PostgreSQL 16 (Alpine image - minimal footprint)

**Responsibilities**:
- Persist structured data (jobs, invoices, materials)
- ACID compliance (data integrity)
- Complex queries (cost calculations)
- Audit trails (who did what)

**Port**: 5432 (internal only - NO external access!)

**Resource Allocation**:
```yaml
limits:
  cpus: '2'
  memory: 2G
reservations:
  cpus: '1'
  memory: 1G
```

**Why PostgreSQL?**
- Strong schema enforcement
- DECIMAL type (precise for money/costs)
- Views & functions (calculate costs automatically)
- JSON support (flexible data)
- Triggers (audit logs)
- ARM64 native on Alpine

**Schema Design**:
```
materials (loại vật liệu)
  ├── PLA, ABS, PETG, TPU...
  └── cost_per_kg, density

print_jobs (công việc in)
  ├── material_id (FK)
  ├── weight_grams, print_time_minutes
  └── status: pending/printing/completed

pricing (cấu hình giá)
  ├── material_id (FK)
  ├── labor_cost_per_hour
  ├── markup_percentage
  └── effective_from/to (temporal)

invoices (hóa đơn)
  ├── customer_id (FK)
  ├── print_job_id (FK)
  ├── total_cost, selling_price, profit
  └── status: draft/pending/paid/cancelled

customers (khách hàng)
  ├── name, email, phone, address
  └── is_active (soft delete)

audit_logs (lịch sử)
  ├── entity_type, entity_id, action
  ├── old_values, new_values (JSONB)
  └── Trigger-based automatic logging
```

---

### 4. REVERSE PROXY LAYER (Nginx)

**Technology**: Nginx (Alpine)

**Responsibilities**:
- Single entry point cho tất cả traffic
- Route /api to Backend, / to Frontend
- Compression (gzip)
- Caching static assets
- SSL termination (optional)
- Health checks for load balancing

**Port**: 80 (HTTP), 443 (HTTPS optional)

**Configuration**:
```nginx
upstream backend { server backend:8080; }
upstream frontend { server frontend:3000; }

server {
    listen 80;
    
    location / { proxy_pass http://frontend; }
    location /api/ { proxy_pass http://backend/api/; }
    location /health { return 200 "healthy"; }
}
```

**Why Nginx?**
- Lightweight (minimal RAM/CPU)
- Fast reverse proxy
- Native compression
- Perfect for single-machine setup

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT DEVICES (Desktop, Tablet, Mobile)                    │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/HTTPS (Port 80/443)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  NGINX REVERSE PROXY (nginx:80)                              │
│  - Route requests                                            │
│  - Compress responses                                        │
│  - Cache static files                                        │
│  - SSL termination (optional)                                │
└──────────┬──────────────────────────────┬───────────────────┘
           │                              │
      PORT 3000                       PORT 8080
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│  FRONTEND (Next.js)  │      │  BACKEND (Node.js)   │
│  - UI Components     │      │  - API Routes        │
│  - State Mgmt        │      │  - Business Logic    │
│  - Validation        │      │  - Cost Calculation  │
└──────────┬───────────┘      └──────────┬───────────┘
           │                             │
           └──────────────┬──────────────┘
                          │
                    PORT 5432 (Internal)
                          ▼
        ┌──────────────────────────────┐
        │  PostgreSQL (postgres:16)    │
        │  - Schema & Data             │
        │  - Complex Queries           │
        │  - Audit Logs                │
        │  - Views & Functions         │
        └──────────────────────────────┘
```

---

## 🌐 Network Architecture

### Port Mapping

| Port | Service | Protocol | Access | Purpose |
|------|---------|----------|--------|---------|
| 80 | Nginx | HTTP | External | Frontend & API gateway |
| 443 | Nginx | HTTPS | External (optional) | Secure frontend & API |
| 3000 | Frontend | HTTP | Internal only | Next.js dev server |
| 8080 | Backend | HTTP | Internal only | Node.js API |
| 5432 | PostgreSQL | TCP | Internal only | Database |

### Network Policies
```yaml
# Only Nginx exposed externally
EXPOSE: 80/443

# Internal communication (Docker network)
Frontend → Backend (3000 → 8080): API calls
Backend → Database (8080 → 5432): Queries
Nginx → Frontend (80 → 3000): Route
Nginx → Backend (80 → 8080): Route

# NO direct external access to database ✅
# NO direct external access to backend API ✅
```

---

## 💾 Storage Architecture

### Volumes (Data Persistence)

```yaml
volumes:
  postgres_data:
    driver: local
    path: ./postgres_data/
    size: ~2-5GB (depends on usage)
    backup: Daily via backup.sh
    recovery: Via SQL dump restore
```

### Backup Strategy

**Frequency**: Daily at 2:00 AM (Launchd)

**What's backed up**:
1. PostgreSQL database dump (SQL)
2. Data volume (tar.gz)
3. Configuration files (.env, docker-compose.yml, nginx.conf)

**Retention**: 30 days (auto-cleanup)

**Cloud Sync**: Optional via rclone (Google Drive, iCloud)

**Recovery Time**: < 5 minutes (restore from backup)

---

## 🔐 Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────┐
│ LAYER 1: Network                                     │
│ - Only port 80/443 exposed                          │
│ - Database NOT accessible externally               │
│ - Internal Docker network for service communication│
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LAYER 2: Application                                │
│ - Input validation (backend)                        │
│ - SQL injection prevention (parameterized queries) │
│ - CORS enabled only for known origins              │
│ - API rate limiting (if implemented)               │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LAYER 3: Data                                        │
│ - ACID compliance (PostgreSQL)                      │
│ - Encryption at rest (optional - OS level)         │
│ - Automated backups (3x redundancy: local/cloud)   │
│ - Audit logs (all changes tracked)                 │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ LAYER 4: Physical                                    │
│ - Mac Mini at secure location                      │
│ - UPS for power redundancy (optional)              │
│ - External SSD for offsite backups                 │
└─────────────────────────────────────────────────────┘
```

### Secrets Management

```
SENSITIVE DATA:
├── Database password        → .env (gitignored)
├── JWT secret (if needed)  → .env (gitignored)
├── API keys               → .env (gitignored)
└── SSL certificates       → ./ssl/ (gitignored)

✅ Never commit .env
✅ Use strong passwords (min 16 chars)
✅ Rotate secrets quarterly
✅ Keep backups of important secrets
```

---

## 📊 Resource Allocation (16GB RAM Total)

```
┌─────────────────────────────────────────┐
│  ALLOCATED MEMORY DISTRIBUTION          │
├─────────────────────────────────────────┤
│  PostgreSQL:        2 GB (limit)  ████  │
│  Backend:           4 GB (limit)  ████  │
│  Frontend:          2 GB (limit)  ████  │
│  Nginx:           256 MB (limit)  ▌     │
│  Docker overhead:  ~1 GB          ██    │
│  OS/System:        ~5 GB          █████ │
├─────────────────────────────────────────┤
│  TOTAL ALLOCATED: ~14.3 GB / 16 GB     │
│  HEADROOM:         ~1.7 GB (margin)    │
└─────────────────────────────────────────┘
```

### Resource Limits Strategy

```yaml
# Each service has:
# - limits: Hard cap (won't exceed)
# - reservations: Guaranteed allocation

db:
  limits:      {cpus: '2', memory: 2G}     # Max 2 cores, 2GB
  reservations: {cpus: '1', memory: 1G}   # Reserved always available

backend:
  limits:      {cpus: '4', memory: 4G}    # Max 4 cores, 4GB
  reservations: {cpus: '2', memory: 2G}  # Reserved always available

frontend:
  limits:      {cpus: '2', memory: 2G}    # Max 2 cores, 2GB
  reservations: {cpus: '1', memory: 1G}  # Reserved always available

nginx:
  limits:      {cpus: '0.5', memory: 256M} # Max 1/2 core, 256MB
  reservations: {cpus: '0.25', memory: 128M}
```

---

## 🔄 Development vs Production

### Development Mode
```yaml
# docker-compose.override.yml is loaded automatically
✅ Hot reload (code changes instant)
✅ Verbose logging (debug: true)
✅ No resource limits (easier debugging)
✅ Larger log files (50MB)
✅ Volume mounts for source code
```

**Usage**:
```bash
docker-compose up -d
# Automatically uses both:
# - docker-compose.yml (base)
# - docker-compose.override.yml (dev overrides)
```

### Production Mode
```yaml
# Only docker-compose.yml
✅ Resource limits enforced
✅ Health checks enabled
✅ Compact logging (10MB files)
✅ Images built & optimized
✅ No source code mounts
```

**Usage**:
```bash
docker-compose -f docker-compose.yml up -d
# Explicitly specify prod config only
```

---

## 🏥 Health & Monitoring

### Health Checks

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U admin"]
    interval: 10s
    timeout: 5s
    retries: 5

backend:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

### Logging Strategy

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"     # Rotate when 10MB
    max-file: "3"       # Keep 3 rotated files (30MB total)
    # Results in ~30MB max per service
```

**Aggregated logs**: < 200MB total (very manageable)

### Monitoring Approach

```
Real-time Monitoring:
├── Docker stats (resource usage)
├── ctop (container-specific)
├── Nginx access.log (traffic)
└── Application logs (errors)

Alerting:
├── Backup failure (launchd logs)
├── Disk space (cron job check)
├── Service restart loops (log monitoring)
└── High resource usage (stats warning)
```

---

## 🚀 Scalability & Future Expansion

### Current Capacity
- **Concurrent Users**: ~50-100 (single Node.js)
- **Print Jobs/Day**: 100-500
- **Invoice Volume**: 100-500/day
- **Data Growth**: ~500MB-1GB/year

### Horizontal Scaling Path (If needed)
```
Phase 1 (Current - Mac Mini):
├── Single Mac Mini M4
├── Monolithic architecture
└── Self-hosted

Phase 2 (If growth):
├── Separate machines
├── Database on external PostgreSQL
├── Multiple backend instances (load balanced)
└── Frontend on CDN (optional)

Phase 3 (If massive scale):
├── Kubernetes cluster
├── Managed database (RDS/Cloud SQL)
├── Microservices decomposition
└── Global CDN
```

---

## 📋 Technology Stack Decision Matrix

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| **Container** | Docker + Compose | Industry standard, simple to maintain |
| **Frontend** | Next.js | Fast dev, good performance, TypeScript |
| **Backend** | Node.js | Quick iteration, good ecosystem, async native |
| **Database** | PostgreSQL | ACID, DECIMAL support, ARM64, mature |
| **Reverse Proxy** | Nginx | Lightweight, fast, reliable |
| **Orchestration** | Docker Compose | Single machine, simple, no K8s overhead |
| **Backup** | pg_dump + tar | Native tools, reliable, simple |
| **Monitoring** | Native tools | No external deps, minimal overhead |
| **OS** | macOS | Develop where you deploy |

---

## ✅ Architectural Principles

1. **Simplicity**: Monolithic, not microservices
2. **Encapsulation**: Everything in Docker
3. **Clarity**: Clear separation of concerns (layers)
4. **Reliability**: Health checks, automated backups
5. **Maintainability**: Clear configuration, good logging
6. **Security**: Defense in depth, secrets management
7. **Performance**: Resource limits, efficient queries
8. **Scalability**: Can grow to multiple machines if needed

---

## 📚 Additional Considerations

### Environment-Specific Behavior

```
Development (.env.local):
- NODE_ENV=development
- LOG_LEVEL=debug
- NEXT_PUBLIC_API_URL=http://localhost:8080

Production (.env):
- NODE_ENV=production
- LOG_LEVEL=info
- NEXT_PUBLIC_API_URL=http://localhost:80
```

### Disaster Recovery
- **RTO** (Recovery Time Objective): < 30 minutes
- **RPO** (Recovery Point Objective): < 24 hours
- **Strategy**: Daily backups + external storage

---

## 🎓 Learning Resources

- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL: https://www.postgresql.org/docs/
- Next.js: https://nextjs.org/docs
- Express.js: https://expressjs.com/
- Nginx: https://nginx.org/en/docs/

---

**Architecture finalized and documented ✅**
