import express from 'express';

import { testAlert } from '../utils/notifier.js';

import { 
  getCurrentStock, 
  recordStockReceived, 
  getReorderAlerts, 
  recordStockDispensed 
} from '../controllers/stock.controller.js';

const router = express.Router();

router.get('/test-alert', testAlert);

router.get('/current', getCurrentStock);

router.post('/received', recordStockReceived);

router.get('/reorder', getReorderAlerts);

router.post('/dispense', recordStockDispensed);

export default router;
