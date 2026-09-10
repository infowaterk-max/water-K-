export const ORDER_LIFECYCLE_STATUSES=[
  'draft',
  'pending',
  'pending_payment',
  'pending_transfer',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
  'refunded',
] as const;

export type OrderLifecycleStatus=typeof ORDER_LIFECYCLE_STATUSES[number];

/**
 * Direct admin status mutation deliberately excludes `refunded`.
 * Refunds have a dedicated audited payment/return flow and must not be reduced
 * to a generic status PATCH.
 */
export const ADMIN_ORDER_MUTATION_STATUSES=[
  'draft',
  'pending',
  'pending_payment',
  'pending_transfer',
  'paid',
  'processing',
  'shipped',
  'completed',
  'cancelled',
] as const;

export type AdminOrderMutationStatus=typeof ADMIN_ORDER_MUTATION_STATUSES[number];

export const ADMIN_ORDER_TRANSITIONS={
  draft:['pending','pending_payment','pending_transfer','cancelled'],
  pending:['paid','processing','cancelled'],
  pending_payment:['paid','cancelled'],
  pending_transfer:['paid','cancelled'],
  paid:['processing'],
  processing:['shipped'],
  shipped:['completed'],
  completed:[],
  cancelled:[],
} as const satisfies Record<AdminOrderMutationStatus,readonly AdminOrderMutationStatus[]>;

export function canAdminTransitionOrder(from:AdminOrderMutationStatus,to:AdminOrderMutationStatus){
  return from===to||(ADMIN_ORDER_TRANSITIONS[from] as readonly AdminOrderMutationStatus[]).includes(to);
}

export function adminOrderNextStatuses(status:string):readonly AdminOrderMutationStatus[]{
  if(!(ADMIN_ORDER_MUTATION_STATUSES as readonly string[]).includes(status))return[];
  return ADMIN_ORDER_TRANSITIONS[status as AdminOrderMutationStatus];
}

export const PAYMENT_STATES=['pending','paid','failed','cancelled','refunded','unknown'] as const;
export type PaymentState=typeof PAYMENT_STATES[number];

export const PAYMENT_ATTEMPT_STATUSES=[
  'created',
  'pending',
  'requires_action',
  'succeeded',
  'failed',
  'cancelled',
  'expired',
  'refunded',
] as const;
export type PaymentAttemptStatus=typeof PAYMENT_ATTEMPT_STATUSES[number];

export const TERMINAL_PAYMENT_ATTEMPT_STATUSES=[
  'succeeded',
  'failed',
  'cancelled',
  'expired',
  'refunded',
] as const satisfies readonly PaymentAttemptStatus[];

export function isTerminalPaymentAttemptStatus(status:PaymentAttemptStatus){
  return (TERMINAL_PAYMENT_ATTEMPT_STATUSES as readonly PaymentAttemptStatus[]).includes(status);
}

const PAYMENT_EVENT_TO_ATTEMPT_STATUS={
  pending:'pending',
  paid:'succeeded',
  failed:'failed',
  cancelled:'cancelled',
  refunded:'refunded',
  unknown:null,
} as const satisfies Record<PaymentState,PaymentAttemptStatus|null>;

export function paymentAttemptStatusFromEvent(status:PaymentState):PaymentAttemptStatus|null{
  return PAYMENT_EVENT_TO_ATTEMPT_STATUS[status];
}
