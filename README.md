# PrintCost - 3D Printing Management System

**Self-hosted 3D printing cost management system for Mac Mini M4**

---

## 📁 Project Structure

```
print-cost/
├── docs/                          # 📚 Documentation
│   ├── README.md                  # Getting started guide
│   ├── SETUP_SUMMARY.md           # Setup checklist
│   ├── ARCHITECTURE.md            # Technical architecture
│   └── DEPLOYMENT.md              # Operations & maintenance
│
├── scripts/                       # 🔧 Automation scripts
│   ├── init.sql                   # Database schema
│   ├── backup.sh                  # Backup script
│   └── setup-launchd.sh           # Launchd setup
│
├── docker-compose.yml             # Production config
├── docker-compose.override.yml    # Development overrides
├── nginx.conf                     # Reverse proxy config
├── .env.example                   # Environment template
├── .gitignore                     # Git exclusions
│
├── backend/                       # (Create) Node.js API
├── frontend/                      # (Create) Next.js UI
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

All documentation is in the [`docs/`](docs/) folder:

| Document | Purpose |
|----------|---------|
| **[GETTING_STARTED.md](docs/GETTING_STARTED.md)** | ⚡ 5-minute setup (START HERE!) |
| **[DATABASE.md](docs/DATABASE.md)** | 🗄️ Database setup, operations & schema |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | 📐 System design & technical details |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** | 🚀 Full deployment & operations guide |

👉 **[Start with GETTING_STARTED.md](docs/GETTING_STARTED.md)**

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

Check [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for troubleshooting guide.

---

**PrintCost v1.0 - Production Ready ✅**
