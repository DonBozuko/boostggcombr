// v253 — Registro de acionamento de travas (guard events).
// Serve só para observabilidade: prova que cada blindagem continua viva.
// Regra de ouro: NUNCA pode lançar erro nem atrasar o fluxo de venda.

export type GuardName =
  | "RATE_LIMIT"
  | "CHECKOUT_DEDUPE"
  | "MARGIN_HOLD"
  | "CIRCUIT_BREAKER"
  | "REFILL";

export const GUARD_ACTION_PREFIX = "GUARD_";

/** Grava (fire-and-forget) que uma trava impediu/ajustou algo. */
export async function logGuard(guard: GuardName, detail: Record<string, unknown> = {}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_email: "system@guards",
      action: `${GUARD_ACTION_PREFIX}${guard}`,
      detail,
    } as any);
  } catch (e) {
    console.warn("[guard-events] falha ao registrar", guard, e);
  }
}
