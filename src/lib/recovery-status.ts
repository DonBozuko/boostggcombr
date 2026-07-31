import { internalStatusesFor, toCanonicalStatus } from "@/lib/order-status";

export const RECOVERY_PENDING_ORDER_STATUSES = internalStatusesFor("PENDENTE");

export const RECOVERY_PAID_ORDER_STATUSES = internalStatusesFor(
  "PAGO",
  "EM_PROCESSAMENTO",
  "ENVIADO_AO_FORNECEDOR",
  "EM_ENTREGA",
  "CONCLUIDO",
);

export const RECOVERY_DEAD_ORDER_STATUSES = internalStatusesFor("CANCELADO");

export function isActionableRecoveryOrder(status: unknown): boolean {
  return toCanonicalStatus(String(status)) === "PENDENTE";
}