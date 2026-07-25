// v251 — Política de retry padrão de painel grande: backoff exponencial com
// jitter, em vez de delay fixo. Erro transiente (blip de rede / 5xx do
// fornecedor) quase sempre resolve na 2ª ou 3ª tentativa espaçada.
// Total máximo ~7s (1.5s + 5s) para caber no limite de execução do servidor.

export const BACKOFF_BASE_MS = [1500, 5000];

/** Delay (ms) antes da tentativa nº `attempt` (attempt 1 = primeira, sem delay). */
export function backoffDelayMs(attempt: number, rnd: number = Math.random()): number {
  if (attempt <= 1) return 0;
  const base = BACKOFF_BASE_MS[Math.min(attempt - 2, BACKOFF_BASE_MS.length - 1)];
  // jitter ±20% evita que várias execuções batam no fornecedor no mesmo instante
  const jitter = base * 0.2 * (rnd * 2 - 1);
  return Math.max(200, Math.round(base + jitter));
}

export const MAX_DISPATCH_ATTEMPTS = BACKOFF_BASE_MS.length + 1;

/** Só erro transiente merece retry. Erro de negócio (saldo, service id) vai pro failover. */
export function isTransientError(err: string): boolean {
  return /timeout|rede|network|ECONN|ETIMEDOUT|ENOTFOUND|fetch failed|socket|\b50[234]\b|429/i.test(err ?? "");
}

export function isBusinessError(err: string): boolean {
  return /saldo|balance|service id|serviceid|não encontrado|not found|invalid link|incorrect/i.test(err ?? "");
}
