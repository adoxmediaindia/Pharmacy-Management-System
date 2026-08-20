// Explicit mapping of allowed status transitions
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'NEW': ['BILLING_PENDING'],
  'BILLING_PENDING': ['BILLING_COMPLETED'],
  'BILLING_COMPLETED': ['PACKING_PENDING'],
  'PACKING_PENDING': ['PACKING_COMPLETED'],
  'PACKING_COMPLETED': ['READY_FOR_DELIVERY'],
  'READY_FOR_DELIVERY': ['ASSIGNED'],
  'ASSIGNED': ['OUT_FOR_DELIVERY'],
  'OUT_FOR_DELIVERY': ['DELIVERED', 'UNDELIVERED'],
  'UNDELIVERED': ['ASSIGNED', 'READY_FOR_DELIVERY'],
};

// Roles authorized to trigger each state transition
export const STATE_ACTORS: Record<string, string[]> = {
  'NEW': ['CALL_RECEIVER', 'ADMIN'],
  'BILLING_PENDING': ['CALL_RECEIVER', 'ADMIN'], // Auto-routed on order creation
  'BILLING_COMPLETED': ['BILLER', 'ADMIN'],
  'PACKING_PENDING': ['BILLER', 'ADMIN'], // Auto-routed on billing completion
  'PACKING_COMPLETED': ['PACKER', 'ADMIN'],
  'READY_FOR_DELIVERY': ['PACKER', 'ADMIN'], // Auto-routed on packing completion
  'ASSIGNED': ['DELIVERY_TEAM', 'ADMIN'],
  'OUT_FOR_DELIVERY': ['DELIVERY_BOY', 'ADMIN'],
  'DELIVERED': ['DELIVERY_BOY', 'ADMIN'],
  'UNDELIVERED': ['DELIVERY_BOY', 'ADMIN'],
};

/**
 * Validates whether an order can transition from its current status to the next.
 */
export function isValidTransition(currentStatus: string, nextStatus: string): boolean {
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus];
  return !!allowedNext && allowedNext.includes(nextStatus);
}

/**
 * Validates whether a user's role is authorized to perform the state transition.
 */
export function isActorAuthorized(role: string, targetStatus: string): boolean {
  if (role === 'ADMIN') return true;
  const authorizedRoles = STATE_ACTORS[targetStatus];
  return !!authorizedRoles && authorizedRoles.includes(role);
}
