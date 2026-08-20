import { Router } from 'express';
import { getNotifications, markAsRead } from '../controllers/notification-controller';
import { authMiddleware } from '../middleware/auth-middleware';

const router = Router();

// GET /api/notifications -> Retrieve user-specific or role-scoped notification queue
router.get('/', authMiddleware as any, getNotifications as any);

// POST /api/notifications/:id/read -> Mark notification as read
router.post('/:id/read', authMiddleware as any, markAsRead as any);

export default router;
