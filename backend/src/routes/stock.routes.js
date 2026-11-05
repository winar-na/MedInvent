import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { testAlert } from '../utils/notifier.js';
import {
  getCurrentStock,
  getExpiryStatus,
  getReorderAlerts,
  recordStockReceived,
  recordStockDispensed,
  deleteBatch,
  updatePrice,
  requireOwner
} from '../controllers/stock.controller.js';

const router = express.Router();

router.get('/test-alert', testAlert);
router.get('/current', getCurrentStock);
router.get('/expiry', getExpiryStatus);
router.get('/reorder', getReorderAlerts);
router.post('/received', recordStockReceived);
router.post('/dispense', recordStockDispensed);
router.delete('/:id', authMiddleware, requireOwner, deleteBatch);
router.put('/:id/price', authMiddleware, requireOwner, updatePrice);

export default router;