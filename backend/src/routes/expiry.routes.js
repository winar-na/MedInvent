import express from 'express';
import { getExpiryAlerts } from '../controllers/expiry.controller.js';
const router = express.Router();

router.get('/alerts', getExpiryAlerts);

export default router;