/** Order statuses treated as paid for reporting and partner stats. */
export const PAID_ORDER_STATUSES = ['paid', 'completed'] as const;

export type PaidOrderStatus = (typeof PAID_ORDER_STATUSES)[number];
