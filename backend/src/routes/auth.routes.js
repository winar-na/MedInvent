import { Router } from 'express';
import { register, login, registerValidators, loginValidators } from '../controllers/auth.controller.js';
const router = Router();

router.post('/register', registerValidators, register);
router.post('/login', loginValidators, login);

export default router;