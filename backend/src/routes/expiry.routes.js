import express from 'express';
import { getExpiryStatus } from '../controllers/stock.controller.js';

const router = express.Router();


router.get('/alerts', getExpiryStatus);

export default router;
