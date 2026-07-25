// v253 — Agregação pura do "Saldo de Guardas" (testável, sem banco).

export type GuardRow = { action: string | null; created_at: string | null };

export type GuardSummaryItem = {
  key: string;
  label: string;
  /** Quantas vezes a trava atuou nas últimas 24h. */
  count: number;
  /** ISO da última atuação, ou null. */
  last: string | null;
  /** true = trava está atuando muito (revisar), não é erro por si só. */
  alto: boolean;
};

const GUARDS: Array<{ key: string; label: string; actions: string[]; altoAcima: number }> = [
  { key: "RATE_LIMIT", label: "Rate limit (spam de pedido)", actions: ["GUARD_RATE_LIMIT"], altoAcima: 20 },
  { key: "CHECKOUT_DEDUPE", label: "Dedupe de checkout (clique duplo)", actions: ["GUARD_CHECKOUT_DEDUPE"], altoAcima: 15 },
  { key: "MARGIN_HOLD", label: "Trava de margem (venda retida)", actions: ["GUARD_MARGIN_HOLD", "MARGIN_HOLD_ERROR"], altoAcima: 1 },
  { key: "CIRCUIT_BREAKER", label: "Circuit breaker (fornecedor pausado)", actions: ["GUARD_CIRCUIT_BREAKER"], altoAcima: 3 },
  { key: "FAILOVER", label: "Failover de fornecedor", actions: ["jarvis_failover"], altoAcima: 3 },
  { key: "REFILL", label: "Reposição automática (drop)", actions: ["GUARD_REFILL", "drop_watcher_v242"], altoAcima: 10 },
];

export function summarizeGuards(rows: GuardRow[]): GuardSummaryItem[] {
  return GUARDS.map((g) => {
    const hits = rows.filter((r) => r.action != null && g.actions.includes(r.action));
    const last = hits
      .map((h) => h.created_at)
      .filter((d): d is string => !!d)
      .sort()
      .pop() ?? null;
    return { key: g.key, label: g.label, count: hits.length, last, alto: hits.length > g.altoAcima };
  });
}
