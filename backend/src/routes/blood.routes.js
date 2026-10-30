import express from 'express';
import { getBlood, createBlood, updateBloodStatus, deleteBlood } from '../controllers/blood.controller.js';
const router = express.Router();

router.get('/', getBlood);
router.post('/', createBlood);
router.put('/:id', updateBloodStatus);
router.delete('/:id', deleteBlood);

export default router;