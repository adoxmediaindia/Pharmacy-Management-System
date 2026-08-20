import { Router } from 'express';
import { getUsers, getDeliveryBoys, getActivityLogs } from '../controllers/user-controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth-middleware';

const router = Router();

// GET /api/users -> Admin audits all users
router.get(
  '/',
  authMiddleware as any,
  roleMiddleware(['ADMIN']) as any,
  getUsers as any
);

// GET /api/users/delivery-boys -> Get riders roster (Riders / Dispatchers / Admin)
router.get(
  '/delivery-boys',
  authMiddleware as any,
  roleMiddleware(['DELIVERY_TEAM', 'ADMIN']) as any,
  getDeliveryBoys as any
);

// GET /api/users/activity-logs -> Admin retrieves audit log of all system actions (ADMIN only)
router.get(
  '/activity-logs',
  authMiddleware as any,
  roleMiddleware(['ADMIN']) as any,
  getActivityLogs as any
);

export default router;
