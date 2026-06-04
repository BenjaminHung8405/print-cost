#!/bin/bash
# ===== SETUP LAUNCHD FOR AUTOMATED BACKUP =====
# Mục đích: Cài đặt Launchd job để chạy backup tự động hàng ngày
# 
# Cách dùng:
#   chmod +x scripts/setup-launchd.sh
#   ./scripts/setup-launchd.sh
#
# Launchd là cơ chế quản lý background jobs native trên macOS (thay cho Cron)

set -e

PROJECT_DIR=\"$(cd \"$(dirname \"${BASH_SOURCE[0]}\")/..\"; pwd)\"
BACKUP_SCRIPT=\"${PROJECT_DIR}/scripts/backup.sh\"
PLIST_FILE=\"${HOME}/Library/LaunchAgents/com.printcost.backup.plist\"
SERVICE_NAME=\"com.printcost.backup\"

echo \"🔧 Setting up Launchd for PrintCost Backup...\"
echo \"\"
echo \"Project Directory: ${PROJECT_DIR}\"
echo \"Backup Script: ${BACKUP_SCRIPT}\"
echo \"Plist File: ${PLIST_FILE}\"
echo \"\"

# ===== STEP 1: Make backup script executable =====
echo \"✓ Making backup script executable...\"
chmod +x \"${BACKUP_SCRIPT}\"

# ===== STEP 2: Create Launchd plist file =====
echo \"✓ Creating Launchd plist configuration...\"
mkdir -p \"${HOME}/Library/LaunchAgents\"

cat > \"${PLIST_FILE}\" << 'EOF'
<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <!-- Service identifier -->
    <key>Label</key>
    <string>com.printcost.backup</string>

    <!-- Program to execute -->
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>REPLACE_WITH_SCRIPT_PATH/scripts/backup.sh</string>
    </array>

    <!-- Run schedule: Daily at 2 AM -->
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>2</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <!-- Restart if crashes -->
    <key>KeepAlive</key>
    <false/>

    <!-- Logging -->
    <key>StandardOutPath</key>
    <string>REPLACE_WITH_HOME_DIR/Library/Logs/printcost-backup-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>REPLACE_WITH_HOME_DIR/Library/Logs/printcost-backup-stderr.log</string>

    <!-- User-run agent (not system-wide) -->
    <key>RunAtLoad</key>
    <false/>

    <!-- Environmental variables (nếu cần) -->
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>

    <!-- Process behavior -->
    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
EOF

# Replace placeholders with actual paths
sed -i '' \"s|REPLACE_WITH_SCRIPT_PATH|${PROJECT_DIR}|g\" \"${PLIST_FILE}\"
sed -i '' \"s|REPLACE_WITH_HOME_DIR|${HOME}|g\" \"${PLIST_FILE}\"

# ===== STEP 3: Load Launchd service =====
echo \"✓ Loading Launchd service...\"

# Unload if already exists
if launchctl list \"${SERVICE_NAME}\" &>/dev/null; then
    launchctl unload \"${PLIST_FILE}\" 2>/dev/null || true
    echo \"  (Unloaded existing service)\"
fi

# Load service
launchctl load \"${PLIST_FILE}\"
echo \"  Service loaded successfully\"

# ===== STEP 4: Verify installation =====
echo \"\"
echo \"✓ Verifying installation...\"
if launchctl list \"${SERVICE_NAME}\" &>/dev/null; then
    echo \"✅ Launchd service is active!\"
    echo \"\"
    echo \"Service Details:\"
    launchctl list \"${SERVICE_NAME}\"
else
    echo \"⚠️  Warning: Service might not be loaded correctly.\"
fi

# ===== STEP 5: Provide info & useful commands =====
echo \"\"
echo \"========================================\"
echo \"✅ Setup Completed!\"
echo \"========================================\"
echo \"\"
echo \"📅 Backup Schedule:\"
echo \"  • Time: Daily at 2:00 AM\"
echo \"  • Location: ${PROJECT_DIR}/backups/\"
echo \"  • Retention: 30 days\"
echo \"\"
echo \"📋 Useful Commands:\"
echo \"\"
echo \"  View service status:\"
echo \"    launchctl list ${SERVICE_NAME}\"
echo \"\"
echo \"  View backup logs:\"
echo \"    tail -f ${HOME}/Library/Logs/printcost-backup-stdout.log\"
echo \"    tail -f ${HOME}/Library/Logs/printcost-backup-stderr.log\"
echo \"\"
echo \"  Run backup manually right now:\"
echo \"    ${BACKUP_SCRIPT}\"
echo \"\"
echo \"  Disable backups (temporarily):\"
echo \"    launchctl unload ${PLIST_FILE}\"
echo \"\"
echo \"  Enable backups again:\"
echo \"    launchctl load ${PLIST_FILE}\"
echo \"\"
echo \"  Remove service completely:\"
echo \"    launchctl unload ${PLIST_FILE}\"
echo \"    rm ${PLIST_FILE}\"
echo \"\"
echo \"========================================\"
echo \"\"
echo \"💡 Next Steps:\"
echo \"  1. Setup rclone for cloud sync (optional):\"
echo \"     brew install rclone\"
echo \"     rclone config\"
echo \"  2. Test backup manually:\"
echo \"     bash scripts/backup.sh\"
echo \"  3. Monitor first few backups in logs\"
echo \"\"
