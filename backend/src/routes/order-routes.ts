import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrderById,
  completeBilling,
  completePacking,
  getReadyDeliveries,
  assignDelivery,
  startDelivery,
  completeDelivery,
} from '../controllers/order-controller';
import { authMiddleware, roleMiddleware } from '../middleware/auth-middleware';

const router = Router();

// Order Operations
router.post('/', authMiddleware as any, roleMiddleware(['CALL_RECEIVER']) as any, createOrder as any);
router.get('/', authMiddleware as any, getOrders as any);
router.get('/:id', authMiddleware as any, getOrderById as any);

// Billing Queue operations
router.post('/billing/complete', authMiddleware as any, roleMiddleware(['BILLER']) as any, completeBilling as any);

// Packing Queue operations
router.post('/packing/complete', authMiddleware as any, roleMiddleware(['PACKER']) as any, completePacking as any);

// Delivery Queue & assignment operations
router.get('/delivery/ready', authMiddleware as any, roleMiddleware(['DELIVERY_TEAM']) as any, getReadyDeliveries as any);
router.post('/delivery/assign', authMiddleware as any, roleMiddleware(['DELIVERY_TEAM']) as any, assignDelivery as any);
router.post('/delivery/start', authMiddleware as any, roleMiddleware(['DELIVERY_BOY']) as any, startDelivery as any);
router.post('/delivery/complete', authMiddleware as any, roleMiddleware(['DELIVERY_BOY']) as any, completeDelivery as any);

export default router;
