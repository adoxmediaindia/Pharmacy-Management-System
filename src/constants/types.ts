export type UserRole =
  | 'ADMIN'
  | 'CALL_RECEIVER'
  | 'BILLER'
  | 'PACKER'
  | 'DELIVERY_TEAM'
  | 'DELIVERY_BOY';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface DashboardStats {
  admin: {
    totalOrders: number;
    pendingBilling: number;
    pendingPacking: number;
    readyForDelivery: number;
    delivered: number;
    recentActivityCount: number;
  };
  callReceiver: {
    createdOrdersCount: number;
    pendingOrdersCount: number;
    scheduledOrdersCount: number;
  };
  biller: {
    pendingBillingCount: number;
    completedBillingCount: number;
  };
  packer: {
    pendingPackingCount: number;
    completedPackingCount: number;
  };
  deliveryTeam: {
    readyForDeliveryCount: number;
    assignedDeliveriesCount: number;
    availableDriversCount: number;
  };
  deliveryBoy: {
    assignedCount: number;
    deliveredCount: number;
    undeliveredCount: number;
  };
}

export interface MockOrder {
  id: string;
  patientName: string;
  doctorName: string;
  address: string;
  contactNumber: string;
  scheduledDateTime: string;
  status: OrderStatus;
  createdAt: string;
  createdById: string;
  amount?: number;
  assignedTo?: string;
  remarks?: string;
}

export type OrderStatus =
  | 'NEW'
  | 'BILLING_PENDING'
  | 'BILLING_COMPLETED'
  | 'PACKING_PENDING'
  | 'PACKING_COMPLETED'
  | 'READY_FOR_DELIVERY'
  | 'ASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'UNDELIVERED';

export interface ActivityLog {
  id: string;
  user: string;
  role: UserRole;
  action: string;
  orderId: string;
  previousStatus?: OrderStatus;
  newStatus?: OrderStatus;
  timestamp: string;
}
