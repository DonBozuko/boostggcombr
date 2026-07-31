export const RECOVERY_PENDING_ORDER_STATUSES = ["pending", "mp_pending", "mp_in_process"] as const;

export const RECOVERY_PAID_ORDER_STATUSES = [
  "approved",
  "paid",
  "provisioning",
  "provisioned",
  "completed",
] as const;

export const RECOVERY_DEAD_ORDER_STATUSES = [
  "expired",
  "cancelled",
  "canceled",
  "mp_cancelled",
  "mp_refunded",
  "refunded",
  "rejected",
  "mp_rejected",
] as const;

export function isActionableRecoveryOrder(status: unknown): boolean {
  return RECOVERY_PENDING_ORDER_STATUSES.includes(
    String(status) as (typeof RECOVERY_PENDING_ORDER_STATUSES)[number],
  );
}