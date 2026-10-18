import express from 'express';

import { 
  getCurrentStock, 
  recordStockReceived, 
  getReorderAlerts, 
  recordStockDispensed 
} from '../controllers/stock.controller.js';

const router = express.Router();

router.get('/current', getCurrentStock);

router.post('/received', recordStockReceived);

router.get('/reorder', getReorderAlerts);

router.post('/dispense', recordStockDispensed);

export default router;
