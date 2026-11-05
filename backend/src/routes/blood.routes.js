import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getBlood, createBlood, updateBloodStatus, deleteBlood } from '../controllers/blood.controller.js';
import { requireOwner } from '../controllers/stock.controller.js';

const router = express.Router();

router.get('/', authMiddleware, getBlood);
router.post('/', authMiddleware, createBlood);
router.put('/:id', authMiddleware, updateBloodStatus);
router.delete('/:id', authMiddleware, requireOwner, deleteBlood);

export default router;