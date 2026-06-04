#!/bin/bash
# ===== PRINTCOST DATABASE BACKUP SCRIPT =====
# Mục đích: Backup PostgreSQL database + volumes data
# Chạy bằng Launchd hoặc Cron job tự động hàng ngày
# 
# Cách dùng:
#   chmod +x scripts/backup.sh
#   ./scripts/backup.sh
#
# Cấu hình Launchd: xem scripts/setup-launchd.sh

set -e  # Exit on error

# ===== CONFIGURATION =====
PROJECT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/..\"; pwd)\"
BACKUP_DIR=\"${PROJECT_DIR}/backups\"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
CONTAINER_NAME=\"printcost_db\"

# Log file
LOG_FILE=\"${BACKUP_DIR}/backup.log\"

# Retention policy (giữ backup trong 30 ngày)
RETENTION_DAYS=30

# ===== SETUP =====
mkdir -p \"${BACKUP_DIR}\"

# Function: Log message with timestamp
log() {
    echo \"[$(date +'%Y-%m-%d %H:%M:%S')] $*\" | tee -a \"${LOG_FILE}\"
}

# Function: Error handler
error_exit() {
    log \"❌ ERROR: $*\"
    exit 1
}

log \"=== Starting PrintCost Backup ===\"
log \"Backup Directory: ${BACKUP_DIR}\"
log \"Timestamp: ${TIMESTAMP}\"

# ===== 1. CHECK DOCKER & CONTAINER =====
log \"✓ Checking Docker daemon...\"
if ! docker info >/dev/null 2>&1; then
    error_exit \"Docker is not running. Start Docker and try again.\"
fi

log \"✓ Checking database container...\"
if ! docker ps | grep -q \"${CONTAINER_NAME}\"; then
    error_exit \"Container '${CONTAINER_NAME}' is not running.\"
fi

# ===== 2. FLUSH CACHE (Ensure data is written to disk) =====
log \"✓ Flushing PostgreSQL cache to disk...\"
docker exec \"${CONTAINER_NAME}\" psql -U admin -c \"CHECKPOINT;\" 2>/dev/null || log \"⚠ Warning: CHECKPOINT might have failed, continuing...\"

# ===== 3. BACKUP DATABASE =====
log \"✓ Backing up PostgreSQL database...\"
DB_BACKUP=\"${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz\"
if docker exec \"${CONTAINER_NAME}\" pg_dump -U admin printcost_db 2>/dev/null | gzip > \"${DB_BACKUP}\"; then
    DB_SIZE=$(du -h \"${DB_BACKUP}\" | cut -f1)
    log \"✓ Database backup completed: ${DB_BACKUP} (${DB_SIZE})\"
else
    error_exit \"Database backup failed\"
fi

# ===== 4. BACKUP VOLUMES =====
log \"✓ Backing up PostgreSQL data volume...\"
VOLUME_BACKUP=\"${BACKUP_DIR}/postgres_data_${TIMESTAMP}.tar.gz\"
if tar -czf \"${VOLUME_BACKUP}\" -C \"${PROJECT_DIR}\" postgres_data 2>/dev/null; then
    VOLUME_SIZE=$(du -h \"${VOLUME_BACKUP}\" | cut -f1)
    log \"✓ Volume backup completed: ${VOLUME_BACKUP} (${VOLUME_SIZE})\"
else
    error_exit \"Volume backup failed\"
fi

# ===== 5. BACKUP CONFIG FILES =====
log \"✓ Backing up configuration files...\"
CONFIG_BACKUP=\"${BACKUP_DIR}/config_${TIMESTAMP}.tar.gz\"
if tar -czf \"${CONFIG_BACKUP}\" \\
    -C \"${PROJECT_DIR}\" \\
    docker-compose.yml \\
    .env \\
    nginx.conf \\
    2>/dev/null; then
    log \"✓ Config backup completed: ${CONFIG_BACKUP}\"
else
    log \"⚠ Warning: Config backup might have failed, continuing...\"
fi

# ===== 6. SYNC TO CLOUD (OPTIONAL - rclone) =====
log \"✓ Attempting to sync backups to cloud...\"
if command -v rclone &> /dev/null; then
    # Cấu hình rclone:
    # rclone config (cấu hình Google Drive hoặc iCloud)
    
    # Option 1: Google Drive
    if rclone ls gdrive:/printcost-backups >/dev/null 2>&1; then
        rclone sync \"${BACKUP_DIR}\" \"gdrive:/printcost-backups\" --progress >/dev/null 2>&1
        log \"✓ Cloud sync completed (Google Drive)\"
    fi
    
    # Option 2: iCloud (nếu setup)
    # rclone sync \"${BACKUP_DIR}\" \"icloud:/PrintCost\" --progress
else
    log \"⚠ rclone not installed. Install with: brew install rclone\"
    log \"⚠ To enable cloud sync, run: rclone config\"
fi

# ===== 7. CLEANUP OLD BACKUPS =====
log \"✓ Cleaning up old backups (keeping last ${RETENTION_DAYS} days)...\"
find \"${BACKUP_DIR}\" -maxdepth 1 -name \"*.gz\" -type f -mtime +${RETENTION_DAYS} -delete
log \"✓ Cleanup completed\"

# ===== 8. SUMMARY =====
BACKUP_COUNT=$(ls \"${BACKUP_DIR}\"/*.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh \"${BACKUP_DIR}\" | cut -f1)
log \"\"
log \"=== Backup Summary ===\"
log \"Total backups: ${BACKUP_COUNT}\"
log \"Total size: ${TOTAL_SIZE}\"
log \"Latest backups:\"
ls -lh \"${BACKUP_DIR}\"/*.gz 2>/dev/null | tail -3 | awk '{print \"  \" $9 \" (\" $5 \")\"}' | tee -a \"${LOG_FILE}\"

log \"\"
log \"✅ Backup completed successfully!\"
log \"====================================\"
