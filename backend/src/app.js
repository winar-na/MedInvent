
import express from 'express';
import cors from 'cors';
import pool from './config/db.js';

import stockRoutes from './routes/stock.routes.js';
import expiryRoutes from './routes/expiry.routes.js';


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MedInvent backend is healthy',
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.status(200).json({
      success: true,
      message: 'MedInvent database connected successfully',
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);

    res.status(500).json({
      success: false,
      message: 'Database connection failed',
    });
  }
});

// Feature routes
app.use('/api/stock', stockRoutes);
app.use('/api/expiry', expiryRoutes);

export default app;
