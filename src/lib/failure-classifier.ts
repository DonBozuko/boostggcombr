// v296 — Classificador de falha de entrega (Torre de Controle).
//
// Por que existe: em 26/07 um pedido de R$283,44 (p15k) foi estornado na hora
// porque dois fornecedores devolveram "Unable to verify your domain submission"
// — um erro TEMPORÁRIO do painel. Minutos depois os mesmos fornecedores
// aceitavam o mesmo link. Resultado: venda real perdida sem necessidade.
//
// Regra nova: estorno imediato só quando a falha é DEFINITIVA (culpa do dado do
// cliente). Qualquer outra coisa é parqueada e retentada pelo SLA watcher antes
// de devolver o dinheiro.

export type FailureKind = "permanent" | "balance" | "transient";

const BALANCE = /insufficient|saldo|balance|not enough|no funds/i;

// Falha definitiva: nem retentar adianta, o dado do pedido é que está errado.
const PERMANENT =
  /invalid link|link inv[áa]lido|private account|conta privada|perfil privado|user not found|usu[áa]rio n[ãa]o encontrado|page not found|incorrect username|no posts|closed account/i;

export function classifyDispatchFailure(tentativas: string[]): FailureKind {
  const all = tentativas.join(" | ");
  if (BALANCE.test(all)) return "balance";
  // Só é permanente se TODAS as tentativas apontarem problema no dado do cliente.
  if (tentativas.length > 0 && tentativas.every((t) => PERMANENT.test(t))) return "permanent";
  return "transient";
}

// Janela de retentativa antes do estorno automático.
export const TRANSIENT_SLA_MS = 2 * 60 * 60 * 1000; // 2h
export const BALANCE_SLA_MS = 24 * 60 * 60 * 1000; // 24h

// v296 — Prazo do parqueamento. O primeiro prazo manda: se o pedido já tem
// sla_deadline, retentativa NÃO empurra o vencimento (senão nunca estorna).
export function resolveSlaDeadline(existing: string | null | undefined, kind: FailureKind, now = Date.now()): string {
  if (existing) {
    const t = new Date(existing).getTime();
    if (Number.isFinite(t)) return new Date(t).toISOString();
  }
  return new Date(now + (kind === "balance" ? BALANCE_SLA_MS : TRANSIENT_SLA_MS)).toISOString();
}
