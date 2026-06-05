# PrintCost - 3D Printing Management System

**Self-hosted 3D printing cost management system for Mac Mini M4**

---

## 📁 Project Structure

```
print-cost/
├── docs/                          # 📚 Documentation
│   ├── README.md                  # Technical guides & operations
│   ├── functional_requirements.md # Functional requirements specification
│   └── db_schema_v4.md            # Database schema V4 specification
│
├── scripts/                       # 🔧 Automation scripts
│   ├── init.sql                   # Database schema
│   ├── backup.sh                  # Backup script
│   ├── test-db.sh                 # Database verification script
│   └── setup-launchd.sh           # Launchd setup
│
├── docker-compose.yml             # Production config
├── docker-compose.override.yml    # Development overrides
├── nginx.conf                     # Reverse proxy config
├── .env.example                   # Environment template
├── .gitignore                     # Git exclusions
│
├── backend/                       # Node.js API
├── frontend/                      # Client applications
│   ├── web/                       # Next.js Web UI (Self-hosted)
│   └── mobile/                    # Flutter Mobile App (Client-side)
│
└── postgres_data/                 # (Auto-created) Database

```

---

## 🚀 Quick Start

```bash
# 1. Setup environment
cp .env.example .env
nano .env  # Change DB_PASSWORD

# 2. Start services
docker-compose up -d

# 3. Access system
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Nginx: http://localhost:80
```

---

## 📚 Documentation

All reference documentation is located in the `docs` directory:

- 📋 **[Đặc tả Yêu cầu Chức năng (Functional Requirements)](docs/functional_requirements.md)**
- 🗄️ **[Đặc tả kỹ thuật Database Schema V4 (Schema Specification)](docs/db_schema_v4.md)**
- 🛠️ **[Hướng dẫn & Tài liệu Kỹ thuật Chi tiết](docs/README.md)**

---

## ⚡ Common Commands

```bash
# Start/Stop
docker-compose up -d              # Start all services
docker-compose down               # Stop all services

# Monitoring
docker-compose logs -f            # View logs
docker stats                      # Resource usage
ctop                             # Container monitor

# Backup
./scripts/backup.sh              # Manual backup
./scripts/setup-launchd.sh       # Setup auto-backup

# Database
docker exec -it printcost_db psql -U admin -d printcost_db
```

---

## 🎯 Features

✅ Production-ready architecture  
✅ Automated daily backups  
✅ Hot-reload development mode  
✅ Health checks & monitoring  
✅ Secure by default  
✅ Fully documented  

---

## 🔐 Security

- `.env` file (with secrets) is gitignored
- Database not exposed externally
- Only Nginx accessible from network
- Resource limits enforced
- Audit logging enabled

---

## 📞 Support

Check [docs/README.md](docs/README.md) for troubleshooting guide.

---

**PrintCost v1.0 - Production Ready ✅**
