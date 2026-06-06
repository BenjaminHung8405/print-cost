import dotenv from 'dotenv';
import knex from 'knex';

// Load environment variables
dotenv.config();

let connectionString = process.env.DATABASE_URL;

// If running in test mode (Vitest), rewrite DATABASE_URL to use the printcost_db_test database
if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
  if (process.env.DATABASE_URL_TEST) {
    connectionString = process.env.DATABASE_URL_TEST;
  } else if (process.env.DATABASE_URL) {
    // Replace the database name at the end of the URL with printcost_db_test
    connectionString = process.env.DATABASE_URL.replace(/\/printcost_db(\?.*)?$/, '/printcost_db_test$1');
  } else {
    connectionString = 'postgres://admin:123456@localhost:5432/printcost_db_test';
  }
}

if (!connectionString) {
  connectionString = 'postgres://admin:admin@localhost:5432/printcost_db';
}

// Initialize Knex database instance
export const db = knex({
  client: 'pg',
  connection: {
    connectionString: connectionString,
    // Add pg-specific ssl configuration if needed in the future, e.g. for production
  },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000, // 30 seconds wait for connection pool
  },
});

/**
 * Attempts to run a simple query on the database.
 * If it fails (e.g. database container starting up), it retries after a delay.
 */
export async function verifyDatabaseConnection(retries = 10, delayMs = 3000): Promise<void> {
  console.log(`Bắt đầu kiểm tra kết nối database... (DATABASE_URL: ${connectionString.split('@')[1] || connectionString})`);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Run a simple query to verify connection
      await db.raw('SELECT 1');
      console.log('✓ Kết nối database thành công!');
      
      // Auto-migrate check constraint for operational_configs to support maintenance_reset_hours
      await db.raw(`
        ALTER TABLE operational_configs DROP CONSTRAINT IF EXISTS check_valid_keys;
        ALTER TABLE operational_configs ADD CONSTRAINT check_valid_keys CHECK (key IN ('machine_depreciation_per_hour', 'labor_cost_per_minute', 'maintenance_reset_hours'));
      `);
      
      return;
    } catch (error: any) {
      console.warn(`⚠️ [Lần thử ${attempt}/${retries}] Chưa thể kết nối database. Chi tiết: ${error.message || error}`);
      
      if (attempt === retries) {
        throw new Error(`LỖI KHỞI ĐỘNG: Không thể kết nối database sau ${retries} lần thử. Chi tiết lỗi cuối cùng: ${error.message || error}`);
      }
      
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
