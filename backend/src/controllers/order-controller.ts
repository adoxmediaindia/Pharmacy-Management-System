import { Response } from 'express';
import prisma from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth-middleware';
import { isValidTransition, isActorAuthorized } from '../utils/state-machine';

/**
 * Helper to generate a unique Order ID in the format: ORD-XXXXXX
 */
async function generateUniqueOrderId(): Promise<string> {
  const min = 100000;
  const max = 999999;
  
  while (true) {
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    const orderId = `ORD-${randomNum}`;
    
    // Ensure uniqueness in the database
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!existing) return orderId;
  }
}

/**
 * 1. POST /api/orders
 * Call Receiver creates an order (starts at status NEW, auto-transitions to BILLING_PENDING)
 */
export async function createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { patientName, doctorName, address, contactNumber, scheduledDateTime, prescriptionUrl } = req.body;
  console.log('[DEBUG-BACKEND] CreateOrder: req.body =', req.body);
  console.log('[DEBUG-BACKEND] CreateOrder: scheduledDateTime =', scheduledDateTime, 'type =', typeof scheduledDateTime);

  // Request validation
  if (!patientName || !doctorName || !address || !contactNumber || !scheduledDateTime) {
    res.status(400).json({ success: false, error: 'Missing required order details' });
    return;
  }

  const parsedDate = new Date(scheduledDateTime);
  if (typeof scheduledDateTime !== 'string' || isNaN(parsedDate.getTime())) {
    res.status(400).json({ success: false, error: 'Invalid scheduled date/time format' });
    return;
  }

  try {
    const orderId = await generateUniqueOrderId();
    const userId = req.user.id;

    // Use a transaction to perform all inserts atomically
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the Order in 'NEW' status
      const order = await tx.order.create({
        data: {
          id: orderId,
          patientName,
          doctorName,
          address,
          contactNumber,
          scheduledDatetime: parsedDate,
          status: 'NEW',
          createdById: userId,
        },
      });

      // 2. Create Prescription attachment if provided
      if (prescriptionUrl) {
        await tx.prescription.create({
          data: {
            orderId: order.id,
            fileUrl: prescriptionUrl,
            uploadedById: userId,
          },
        });
      }

      // 3. Write 'NEW' Order Status History
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: null,
          newStatus: 'NEW',
          changedById: userId,
          remarks: 'Order initiated',
        },
      });

      // 4. Write Activity Log
      await tx.activityLog.create({
        data: {
          userId,
          action: 'Created order',
          orderId: order.id,
          newStatus: 'NEW',
        },
      });

      // 5. AUTO-TRANSITION TO 'BILLING_PENDING' (Applying State Machine rules)
      if (!isValidTransition('NEW', 'BILLING_PENDING')) {
        throw new Error('Invalid state transition from NEW to BILLING_PENDING');
      }

      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'BILLING_PENDING' },
      });

      // 6. Write status transition history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: 'NEW',
          newStatus: 'BILLING_PENDING',
          changedById: userId,
          remarks: 'Order queued for billing',
        },
      });

      // 7. Write notification for Biller role
      await tx.notification.create({
        data: {
          role: 'BILLER',
          title: 'New Order Received',
          message: `Order ${order.id} has been added. Pending billing setup.`,
        },
      });
      return updatedOrder;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    res.status(201).json({
      success: true,
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ 
      success: false, 
      error: `Order creation failed: ${error.message || error.toString()}`,
      details: error.stack || error.toString()
    });
  }
}

/**
 * 2. GET /api/orders
 * Returns a list of orders filtered by the requesting user's role access scopes.
 */
export async function getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { id: userId, role } = req.user;

  try {
    let whereClause: any = {};

    // Apply role-based visibility scoping
    if (role === 'CALL_RECEIVER') {
      // Call receiver only sees orders they created
      whereClause.createdById = userId;
    } else if (role === 'BILLER') {
      // Biller queue sees orders pending or completed in billing
      whereClause.status = { in: ['NEW', 'BILLING_PENDING', 'BILLING_COMPLETED'] };
    } else if (role === 'PACKER') {
      // Packer queue sees orders pending/completed in packing
      whereClause.status = { in: ['BILLING_COMPLETED', 'PACKING_PENDING', 'PACKING_COMPLETED'] };
    } else if (role === 'DELIVERY_TEAM') {
      // Dispatchers see orders ready for dispatch and onward
      whereClause.status = {
        in: ['PACKING_COMPLETED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'UNDELIVERED'],
      };
    } else if (role === 'DELIVERY_BOY') {
      // Riders only see orders explicitly assigned to them
      whereClause.assignments = {
        some: {
          deliveryBoyId: userId,
          status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] }, // Only show active/unresolved assignments
        },
      };
    }
    // ADMIN has no filters and sees all orders

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        prescriptions: { select: { fileUrl: true } },
        bills: { select: { amount: true, fileUrl: true } },
        assignments: {
          where: { status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] } },
          select: { deliveryBoy: { select: { fullName: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred while retrieving orders' });
  }
}

/**
 * 3. GET /api/orders/:id
 * Fetches specific order details enforcing strengthened authorization rules.
 */
export async function getOrderById(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { id: orderId } = req.params;
  const { id: userId, role } = req.user;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        prescriptions: true,
        bills: true,
        packingRecords: true,
        deliveryRecords: true,
        assignments: {
          include: {
            deliveryBoy: { select: { id: true, fullName: true, username: true } },
          },
        },
        statusHistory: {
          include: {
            changedBy: { select: { fullName: true, role: { select: { name: true } } } },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // ENFORCE STRENGTHENED GET /api/orders/:id AUTHORIZATION
    let authorized = false;

    if (role === 'ADMIN') {
      authorized = true;
    } else if (role === 'CALL_RECEIVER') {
      authorized = order.createdById === userId;
    } else if (role === 'BILLER') {
      authorized = ['NEW', 'BILLING_PENDING', 'BILLING_COMPLETED'].includes(order.status);
    } else if (role === 'PACKER') {
      authorized = ['BILLING_COMPLETED', 'PACKING_PENDING', 'PACKING_COMPLETED'].includes(order.status);
    } else if (role === 'DELIVERY_TEAM') {
      authorized = ['PACKING_COMPLETED', 'READY_FOR_DELIVERY', 'ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'UNDELIVERED'].includes(order.status);
    } else if (role === 'DELIVERY_BOY') {
      // Check if order is assigned to this rider
      const isAssigned = order.assignments.some(
        (asn) => asn.deliveryBoyId === userId
      );
      authorized = isAssigned;
    }

    if (!authorized) {
      res.status(403).json({ success: false, error: 'Access denied: You are not authorized to view this order.' });
      return;
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Fetch order details error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred while retrieving order details' });
  }
}

/**
 * 4. POST /api/billing/complete
 * Biller completes billing for an order, auto-transitioning it to PACKING_PENDING
 */
export async function completeBilling(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { orderId, amount, billProofUrl } = req.body;

  if (!orderId || amount === undefined || !billProofUrl) {
    res.status(400).json({ success: false, error: 'Missing billing complete details' });
    return;
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    res.status(400).json({ success: false, error: 'Billing amount must be a positive number' });
    return;
  }

  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Validate role actor authority
    if (!isActorAuthorized(userRole, 'BILLING_COMPLETED')) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to complete billing' });
      return;
    }

    // Validate current transition
    if (!isValidTransition(order.status, 'BILLING_COMPLETED')) {
      res.status(400).json({ success: false, error: `Invalid state transition from ${order.status} to BILLING_COMPLETED` });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Log the Bill details
      await tx.bill.create({
        data: {
          orderId,
          amount: numericAmount,
          fileUrl: billProofUrl,
          billedById: userId,
        },
      });

      // 2. Set Status to BILLING_COMPLETED
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'BILLING_COMPLETED' },
      });

      // 3. Write History
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: 'BILLING_COMPLETED',
          changedById: userId,
          remarks: `Invoiced for $${numericAmount.toFixed(2)}`,
        },
      });

      // 4. Log Activity
      await tx.activityLog.create({
        data: {
          userId,
          action: `Completed billing for $${numericAmount}`,
          orderId,
          previousStatus: order.status,
          newStatus: 'BILLING_COMPLETED',
        },
      });

      // 5. AUTO-TRANSITION TO PACKING_PENDING
      if (!isValidTransition('BILLING_COMPLETED', 'PACKING_PENDING')) {
        throw new Error('Invalid transition from BILLING_COMPLETED to PACKING_PENDING');
      }

      const finalOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PACKING_PENDING' },
      });

      // 6. Write Packing Pending History
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: 'BILLING_COMPLETED',
          newStatus: 'PACKING_PENDING',
          changedById: userId,
          remarks: 'Order queued for packing',
        },
      });

      // 7. Notify Packer role
      await tx.notification.create({
        data: {
          role: 'PACKER',
          title: 'Invoice Completed',
          message: `Order ${orderId} has been billed. Ready for packaging.`,
        },
      });

      return finalOrder;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Complete billing error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred during billing submission' });
  }
}

/**
 * 5. POST /api/packing/complete
 * Packer completes packaging, auto-transitioning order to READY_FOR_DELIVERY
 */
export async function completePacking(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { orderId, packingProofUrl } = req.body;

  if (!orderId || !packingProofUrl) {
    res.status(400).json({ success: false, error: 'Missing packing completion details' });
    return;
  }

  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (!isActorAuthorized(userRole, 'PACKING_COMPLETED')) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to complete packing' });
      return;
    }

    if (!isValidTransition(order.status, 'PACKING_COMPLETED')) {
      res.status(400).json({ success: false, error: `Invalid transition from ${order.status} to PACKING_COMPLETED` });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Create packing record
      await tx.packingRecord.create({
        data: {
          orderId,
          fileUrl: packingProofUrl,
          packedById: userId,
        },
      });

      // 2. Set Status to PACKING_COMPLETED
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PACKING_COMPLETED' },
      });

      // 3. Write History
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: 'PACKING_COMPLETED',
          changedById: userId,
          remarks: 'Packaging verified and sealed',
        },
      });

      // 4. Log Activity
      await tx.activityLog.create({
        data: {
          userId,
          action: 'Completed packing order',
          orderId,
          previousStatus: order.status,
          newStatus: 'PACKING_COMPLETED',
        },
      });

      // 5. AUTO-TRANSITION TO READY_FOR_DELIVERY
      if (!isValidTransition('PACKING_COMPLETED', 'READY_FOR_DELIVERY')) {
        throw new Error('Invalid transition from PACKING_COMPLETED to READY_FOR_DELIVERY');
      }

      const finalOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'READY_FOR_DELIVERY' },
      });

      // 6. Write Ready for Delivery history
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: 'PACKING_COMPLETED',
          newStatus: 'READY_FOR_DELIVERY',
          changedById: userId,
          remarks: 'Order waiting for driver assignment',
        },
      });

      // 7. Notify Dispatch Team
      await tx.notification.create({
        data: {
          role: 'DELIVERY_TEAM',
          title: 'Order Ready for Dispatch',
          message: `Order ${orderId} has been packed. Ready for rider assignment.`,
        },
      });

      return finalOrder;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Complete packing error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred during packing submission' });
  }
}

/**
 * 6a. GET /api/delivery/ready
 * Retrieve orders that are currently READY_FOR_DELIVERY (DELIVERY_TEAM or ADMIN only)
 */
export async function getReadyDeliveries(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const orders = await prisma.order.findMany({
      where: { status: 'READY_FOR_DELIVERY' },
      orderBy: { updatedAt: 'asc' },
    });

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error('Fetch ready deliveries error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred while retrieving ready deliveries' });
  }
}

/**
 * 6b. POST /api/delivery/assign
 * Delivery Team assigns an order to a specific Delivery Boy (transitions status to ASSIGNED)
 */
export async function assignDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { orderId, deliveryBoyId } = req.body;

  if (!orderId || !deliveryBoyId) {
    res.status(400).json({ success: false, error: 'Missing assignment details' });
    return;
  }

  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify order exists
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Verify target delivery boy is valid
    const deliveryBoy = await prisma.user.findUnique({
      where: { id: deliveryBoyId },
      include: { role: true },
    });
    if (!deliveryBoy || deliveryBoy.role.name !== 'DELIVERY_BOY') {
      res.status(400).json({ success: false, error: 'Selected rider is invalid or does not have delivery privileges' });
      return;
    }

    if (!isActorAuthorized(userRole, 'ASSIGNED')) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to assign deliveries' });
      return;
    }

    if (!isValidTransition(order.status, 'ASSIGNED')) {
      res.status(400).json({ success: false, error: `Invalid transition from ${order.status} to ASSIGNED` });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Create a delivery assignment (Mark any old assignments for this order as obsolete/FAILED if reassigning)
      await tx.deliveryAssignment.updateMany({
        where: { orderId, status: 'ASSIGNED' },
        data: { status: 'FAILED' },
      });

      const assignment = await tx.deliveryAssignment.create({
        data: {
          orderId,
          deliveryBoyId,
          assignedById: userId,
          status: 'ASSIGNED',
        },
      });

      // 2. Set order status to ASSIGNED
      const orderUpdated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'ASSIGNED' },
      });

      // 3. Write History
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: 'ASSIGNED',
          changedById: userId,
          remarks: `Assigned to delivery boy ${deliveryBoy.fullName}`,
        },
      });

      // 4. Log Activity
      await tx.activityLog.create({
        data: {
          userId,
          action: `Assigned delivery to rider: ${deliveryBoy.username}`,
          orderId,
          previousStatus: order.status,
          newStatus: 'ASSIGNED',
        },
      });

      // 5. Create user-specific Notification for the Rider
      await tx.notification.create({
        data: {
          userId: deliveryBoyId,
          title: 'New Delivery Assigned',
          message: `Order ${orderId} has been assigned to you. Verify details in your queue.`,
        },
      });

      return orderUpdated;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Assign delivery error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred during delivery assignment' });
  }
}

/**
 * 6c. POST /api/delivery/start
 * Delivery boy starts shipping the order (transitions status to OUT_FOR_DELIVERY)
 */
export async function startDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { orderId } = req.body;
  if (!orderId) {
    res.status(400).json({ success: false, error: 'Order ID is required' });
    return;
  }

  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { assignments: true },
    });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    // Verify actor roles
    if (!isActorAuthorized(userRole, 'OUT_FOR_DELIVERY')) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges to dispatch delivery' });
      return;
    }

    // Enforce that only the ASSIGNED delivery boy can trigger transit (or Admin)
    if (userRole !== 'ADMIN') {
      const activeAssignment = order.assignments.find(
        (asn) => asn.deliveryBoyId === userId && asn.status === 'ASSIGNED'
      );
      if (!activeAssignment) {
        res.status(403).json({ success: false, error: 'Access denied: You are not assigned to deliver this order' });
        return;
      }
    }

    if (!isValidTransition(order.status, 'OUT_FOR_DELIVERY')) {
      res.status(400).json({ success: false, error: `Invalid transition from ${order.status} to OUT_FOR_DELIVERY` });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update active delivery assignment status to OUT_FOR_DELIVERY
      await tx.deliveryAssignment.updateMany({
        where: { orderId, deliveryBoyId: userId, status: 'ASSIGNED' },
        data: { status: 'OUT_FOR_DELIVERY' },
      });

      // 2. Set order status to OUT_FOR_DELIVERY
      const orderUpdated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'OUT_FOR_DELIVERY' },
      });

      // 3. Write History
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: 'OUT_FOR_DELIVERY',
          changedById: userId,
          remarks: 'Rider departed. Order is out for delivery.',
        },
      });

      // 4. Log Activity
      await tx.activityLog.create({
        data: {
          userId,
          action: 'Dispatched order for delivery',
          orderId,
          previousStatus: order.status,
          newStatus: 'OUT_FOR_DELIVERY',
        },
      });

      return orderUpdated;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Start delivery error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred during transit dispatch' });
  }
}

/**
 * 6d. POST /api/delivery/complete
 * Delivery boy marks order as DELIVERED or UNDELIVERED
 */
export async function completeDelivery(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const { orderId, status, paymentReceived, paymentAmount, remarks } = req.body;

  if (!orderId || !status) {
    res.status(400).json({ success: false, error: 'Missing delivery completion details' });
    return;
  }

  if (status !== 'DELIVERED' && status !== 'UNDELIVERED') {
    res.status(400).json({ success: false, error: 'Status must be DELIVERED or UNDELIVERED' });
    return;
  }

  if (status === 'UNDELIVERED' && !remarks?.trim()) {
    res.status(400).json({ success: false, error: 'Remarks are required for failed/undelivered orders' });
    return;
  }

  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { assignments: true },
    });
    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    if (!isActorAuthorized(userRole, status)) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient privileges' });
      return;
    }

    // Verify this specific rider is assigned
    if (userRole !== 'ADMIN') {
      const activeAssignment = order.assignments.find(
        (asn) => asn.deliveryBoyId === userId && asn.status === 'OUT_FOR_DELIVERY'
      );
      if (!activeAssignment) {
        res.status(403).json({ success: false, error: 'Access denied: You are not currently delivering this order' });
        return;
      }
    }

    if (!isValidTransition(order.status, status)) {
      res.status(400).json({ success: false, error: `Invalid transition from ${order.status} to ${status}` });
      return;
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Create a delivery record
      const numericPayment = Number(paymentAmount || 0);
      await tx.deliveryRecord.create({
        data: {
          orderId,
          deliveryBoyId: userId,
          status,
          paymentReceived: !!paymentReceived,
          paymentAmount: numericPayment,
          remarks: remarks || null,
        },
      });

      // 2. Update assignment status
      const assignmentStatus = status === 'DELIVERED' ? 'COMPLETED' : 'FAILED';
      await tx.deliveryAssignment.updateMany({
        where: { orderId, deliveryBoyId: userId, status: 'OUT_FOR_DELIVERY' },
        data: { status: assignmentStatus },
      });

      // 3. Set order status to DELIVERED or UNDELIVERED
      const orderUpdated = await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      // 4. Write History
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: status,
          changedById: userId,
          remarks: status === 'DELIVERED'
            ? `Successfully delivered. Collected $${numericPayment.toFixed(2)}.`
            : `Attempt failed. Reason: ${remarks}`,
        },
      });

      // 5. Log Activity
      await tx.activityLog.create({
        data: {
          userId,
          action: `Completed delivery attempt: ${status}`,
          orderId,
          previousStatus: order.status,
          newStatus: status,
        },
      });

      // 6. Notify Dispatch Team & Admin
      await tx.notification.create({
        data: {
          role: 'DELIVERY_TEAM',
          title: status === 'DELIVERED' ? 'Delivery Completed' : 'Delivery Attempt Failed',
          message: status === 'DELIVERED'
            ? `Order ${orderId} was delivered by ${req.user?.username}.`
            : `Order ${orderId} attempt failed. Reason: ${remarks}`,
        },
      });

      return orderUpdated;
    }, {
      maxWait: 15000,
      timeout: 30000,
    });

    res.status(200).json({
      success: true,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Complete delivery error:', error);
    res.status(500).json({ success: false, error: 'An internal error occurred during delivery completion logging' });
  }
}
