import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getExpiryAlerts } from '../controllers/expiry.controller.js';

const router = express.Router();

router.get('/', authMiddleware, getExpiryAlerts);
router.get('/alerts', authMiddleware, getExpiryAlerts);

export default router;