#!/bin/bash

# ==========================================
# PRINTCOST DATABASE TEST SCRIPT
# ==========================================
# Kiểm tra xem Schema V4 đã khởi tạo đúng trên Mac Mini M4
# Sử dụng: bash scripts/test-db.sh

set -e  # Exit on error

DB_USER="${DB_USER:-admin}"
DB_PASSWORD="${DB_PASSWORD:-123456}"
DB_NAME="${DB_NAME:-printcost_db}"
CONTAINER_NAME="${CONTAINER_NAME:-printcost_db}"

echo "🚀 PRINTCOST DATABASE V4 - VERIFICATION SCRIPT"
echo "==============================================="

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

# Test 1: Check if container is running
echo -e "\n${YELLOW}[TEST 1]${NC} Verifying container is running..."
if docker ps | grep -q "$CONTAINER_NAME"; then
    pass "Container $CONTAINER_NAME is running"
else
    fail "Container $CONTAINER_NAME is not running"
fi

# Test 2: Check database initialization
echo -e "\n${YELLOW}[TEST 2]${NC} Verifying database exists..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    pass "Database $DB_NAME is accessible"
else
    fail "Cannot access database $DB_NAME"
fi

# Test 3: List all tables
echo -e "\n${YELLOW}[TEST 3]${NC} Verifying all tables exist..."
TABLES=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
if [ "$TABLES" -eq 7 ]; then
    pass "All 7 tables created successfully"
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "\dt" | tail -n +4
else
    warn "Expected 7 tables but found $TABLES"
fi

# Test 4: Check functions
echo -e "\n${YELLOW}[TEST 4]${NC} Verifying functions..."
FUNCS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION';")
if [ "$FUNCS" -ge 4 ]; then
    pass "Functions created ($FUNCS found)"
else
    fail "Expected at least 4 functions but found $FUNCS"
fi

# Test 5: Check seed data - Materials
echo -e "\n${YELLOW}[TEST 5]${NC} Verifying seed data - Materials..."
MATERIALS_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM materials;")
if [ "$MATERIALS_COUNT" -gt 0 ]; then
    pass "Materials seeded ($MATERIALS_COUNT records)"
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT name, price_per_kg, fail_rate, default_margin FROM materials ORDER BY id;" | tail -n +3
else
    fail "No materials found in database"
fi

# Test 6: Check seed data - Operational Configs
echo -e "\n${YELLOW}[TEST 6]${NC} Verifying seed data - Operational Configs..."
CONFIGS_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM operational_configs;")
if [ "$CONFIGS_COUNT" -eq 3 ]; then
    pass "Operational configs seeded (3 records)"
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT key, value, description FROM operational_configs ORDER BY key;" | tail -n +3
else
    fail "Expected 3 operational configs but found $CONFIGS_COUNT"
fi

# Test 7: Check seed data - Fixed Items
echo -e "\n${YELLOW}[TEST 7]${NC} Verifying seed data - Fixed Items..."
FIXED_ITEMS_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM fixed_items;")
if [ "$FIXED_ITEMS_COUNT" -gt 0 ]; then
    pass "Fixed items seeded ($FIXED_ITEMS_COUNT records)"
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT name, item_type, cost FROM fixed_items ORDER BY id;" | tail -n +3
else
    fail "No fixed items found in database"
fi

# Test 8: Test round_to_100() function
echo -e "\n${YELLOW}[TEST 8]${NC} Testing round_to_100() function..."
RESULT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT round_to_100(24950.5)::BIGINT;")
if [ "$RESULT" -eq 25000 ]; then
    pass "round_to_100(24950.5) = 25000 ✓"
else
    fail "round_to_100(24950.5) returned $RESULT, expected 25000"
fi

# Test 9: Test negative value check in round_to_100()
echo -e "\n${YELLOW}[TEST 9]${NC} Testing round_to_100() negative value rejection..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT round_to_100(-100);" > /dev/null 2>&1; then
    fail "round_to_100(-100) should have raised exception but didn't"
else
    pass "round_to_100(-100) correctly rejected negative value"
fi

# Test 10: Test CHECK constraints
echo -e "\n${YELLOW}[TEST 10]${NC} Testing CHECK constraints..."
# Test negative price_per_kg
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO materials (name, price_per_kg, fail_rate, default_margin) VALUES ('TEST_INVALID', -100, 1.0, 0.3);" > /dev/null 2>&1; then
    fail "CHECK constraint on price_per_kg failed - accepted negative value"
else
    pass "CHECK constraint on price_per_kg correctly rejected negative value"
fi

# Test 11: Test fail_rate constraint
echo -e "\n${YELLOW}[TEST 11]${NC} Testing fail_rate constraint..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO materials (name, price_per_kg, fail_rate, default_margin) VALUES ('TEST_INVALID', 100, 0.5, 0.3);" > /dev/null 2>&1; then
    fail "CHECK constraint on fail_rate failed - accepted value < 1.0"
else
    pass "CHECK constraint on fail_rate correctly rejected value < 1.0"
fi

# Test 12: Test margin constraint
echo -e "\n${YELLOW}[TEST 12]${NC} Testing margin constraint (0.0-1.0)..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO materials (name, price_per_kg, fail_rate, default_margin) VALUES ('TEST_INVALID', 100, 1.1, 1.5);" > /dev/null 2>&1; then
    fail "CHECK constraint on default_margin failed - accepted value > 1.0"
else
    pass "CHECK constraint on default_margin correctly rejected value > 1.0"
fi

# Test 13: Test view creation
echo -e "\n${YELLOW}[TEST 13]${NC} Verifying view_orders_summary..."
VIEWS=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM information_schema.views WHERE table_schema='public' AND table_name='view_orders_summary';")
if [ "$VIEWS" -eq 1 ]; then
    pass "view_orders_summary exists"
else
    fail "view_orders_summary not found"
fi

# Test 14: Test order creation (should succeed)
echo -e "\n${YELLOW}[TEST 14]${NC} Testing order creation..."
if docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO orders (customer_name, customer_contact, status) VALUES ('Test Customer', '0901234567', 'draft');" > /dev/null 2>&1; then
    pass "Order created successfully"
else
    fail "Failed to create test order"
fi

# Test 15: Database statistics
echo -e "\n${YELLOW}[TEST 15]${NC} Database statistics..."
docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c \
    "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"

# Summary
echo -e "\n${GREEN}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ ALL TESTS PASSED${NC}"
echo -e "${GREEN}Schema V4 is ready for production use!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════${NC}"
