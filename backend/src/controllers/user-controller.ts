import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth-middleware';

/**
 * Fetch all users inside the system (ADMIN only).
 */
export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        createdAt: true,
        role: {
          select: {
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, error: 'An internal server error occurred while retrieving users' });
  }
}

/**
 * Fetch users that belong to the DELIVERY_BOY role (DELIVERY_TEAM and ADMIN allowed).
 */
export async function getDeliveryBoys(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    // 1. Fetch the Delivery Boy role ID
    const riderRole = await prisma.role.findUnique({
      where: { name: 'DELIVERY_BOY' },
    });

    if (!riderRole) {
      res.status(200).json({ success: true, deliveryBoys: [] });
      return;
    }

    // 2. Fetch all users belonging to this role
    const deliveryBoys = await prisma.user.findMany({
      where: { roleId: riderRole.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
      },
      orderBy: { fullName: 'asc' },
    });

    res.status(200).json({
      success: true,
      deliveryBoys,
    });
  } catch (error) {
    console.error('Error fetching delivery boys:', error);
    res.status(500).json({ success: false, error: 'An internal server error occurred while retrieving riders' });
  }
}

/**
 * Fetch all activity logs inside the system (ADMIN only).
 */
export async function getActivityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const activityLogs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: {
            fullName: true,
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 100, // limit to latest 100 logs
    });

    res.status(200).json({
      success: true,
      activityLogs,
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ success: false, error: 'An internal server error occurred while retrieving activity logs' });
  }
}
