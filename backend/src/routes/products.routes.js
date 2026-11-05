import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getAllProducts, createProduct } from '../controllers/product.controller.js';
import { requireOwner } from '../controllers/stock.controller.js';

const router = express.Router();

router.get('/', authMiddleware, getAllProducts);
router.post('/', authMiddleware, createProduct);

export default router;