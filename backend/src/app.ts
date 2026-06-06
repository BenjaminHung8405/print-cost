import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { calculateRequestSchema } from './core/calculation/schemas';
import { calculateProductCosts } from './core/calculation/engine';
import { verifyDatabaseConnection, db } from './core/database/client';
import { materialsRouter } from './api/routes/materials';
import { fixedItemsRouter } from './api/routes/fixed-items';
import { productsRouter } from './api/routes/products';
import { ordersRouter } from './api/routes/orders';
import { configsRouter } from './api/routes/configs';
import { analyticsRouter } from './api/routes/analytics';
import { errorHandler } from './api/middlewares/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 8080;

// Enable CORS and JSON parsing
app.use(cors()); // Cho phép mọi Origin truy cập (Next.js localhost:3000 & Mobile LAN/Expo client)
app.use(express.json());

/**
 * Health check endpoint
 * Verifies that the API server is up and can query the database.
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    await db.raw('SELECT 1');
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Database health check failed:', error);
    return res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: error.message || error,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Pricing calculation endpoint
 * Validates request payload and calculates raw costs, COGS, suggested price, and final price.
 */
app.post('/api/calculate', (req: Request, res: Response) => {
  const parseResult = calculateRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    // Format Zod errors to be user-friendly
    const errors = parseResult.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Dữ liệu đầu vào không hợp lệ',
      errors,
    });
  }

  try {
    const calculation = calculateProductCosts(parseResult.data);
    return res.status(200).json({
      success: true,
      data: calculation,
    });
  } catch (error: any) {
    console.error('Calculation error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Lỗi hệ thống khi thực hiện tính toán',
    });
  }
});

// Register CRUD Category Management routers
app.use('/api/materials', materialsRouter);
app.use('/api/fixed-items', fixedItemsRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/operational-configs', configsRouter);
app.use('/api/analytics', analyticsRouter);

// Register centralized error handling middleware at the very end
app.use(errorHandler);

// Bootstrapping function
async function startServer() {
  try {
    // Ensure DB is ready before listening to API requests
    // (Only verify connection if not running inside a test environment)
    if (process.env.NODE_ENV !== 'test') {
      await verifyDatabaseConnection();
    }

    app.listen(PORT, () => {
      console.log(`🚀 PrintCost Backend đang chạy trên cổng ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Không thể khởi động server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;
