import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool from './config/db.js';

import stockRoutes from './routes/stock.routes.js';
import expiryRoutes from './routes/expiry.routes.js';
import productRoutes from './routes/products.routes.js';
import bloodRoutes from './routes/blood.routes.js';

import './utils/notifier.js';
import { testAlert } from './utils/notifier.js';

const app = express();

// cors() was open, this allows localhost + Vercel for deployment
app.use(cors({
  origin: ['http://localhost:5173', 'https://medinvent.vercel.app', /vercel\.app$/],
  credentials: true
}));
app.use(express.json());

app.get('/', (req, res) => res.send('MedInvent API running - Go to /api/health'));

//  OFFLINE MODE 
app.get('/api/health', (req, res) => res.json({ success: true, message: 'MedInvent backend is healthy' }));

app.get('/api/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ success: true, time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ success: false, message: 'DB offline - check wifi' });
  }
});

app.get('/api/test-alert', testAlert);

app.use('/api/stock', stockRoutes);
app.use('/api/expiry', expiryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/blood', bloodRoutes);

export default app;