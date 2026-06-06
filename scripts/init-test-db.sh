#!/bin/sh
set -e

echo "Creating test database printcost_db_test..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE printcost_db_test;
EOSQL

echo "Initializing schema for test database..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "printcost_db_test" -f /docker-entrypoint-initdb.d/01-init.sql
echo "Test database printcost_db_test initialized successfully."
