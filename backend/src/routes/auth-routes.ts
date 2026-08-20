import { Router } from 'express';
import { login, logout } from '../controllers/auth-controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();

// POST /api/auth/login -> User sign-in
router.post('/login', login);

// POST /api/auth/logout -> User sign-out (updates activity logs, requires JWT)
router.post('/logout', authMiddleware as any, logout as any);

export default router;
