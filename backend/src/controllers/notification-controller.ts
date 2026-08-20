import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

/**
 * Fetch all notifications relevant to the authenticated user.
 * Returns notifications targeted at their specific User ID or general notification triggers targeting their User Role.
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { id: userId, role } = req.user;

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          // Targeted specifically to this user ID
          { userId },
          // Targeted to this user's role globally
          {
            AND: [
              { role },
              { userId: null },
            ],
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Limit to recent 50
    });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred while retrieving notifications' });
  }
}

/**
 * Mark a specific notification as read.
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  try {
    // Verify notification exists
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found' });
      return;
    }

    // Verify ownership security (ensure Biller can't read-clear Rider's direct notifications)
    if (notification.userId && notification.userId !== req.user.id) {
      res.status(403).json({ success: false, error: 'Forbidden: Access denied' });
      return;
    }

    if (notification.role && notification.role !== req.user.role && !notification.userId) {
      res.status(403).json({ success: false, error: 'Forbidden: Access denied' });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred while updating notification' });
  }
}
