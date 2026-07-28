// v324 — FILA QUE ANDA SOZINHA (decisão pura).
//
// Por que existe: pedido pago que não achou rota vira `waiting_provision` /
// `MARGIN_HOLD` / `SMM_FAILED` e, até aqui, SÓ saía dali quando um humano
// clicava no botão do Telegram. Se o dono está dormindo, o cliente pagou e
// espera. Isso é fila de mentira.
//
// Aqui fica a regra de QUANDO retentar: idade mínima, backoff crescente entre
// tentativas e teto de tentativas antes de escalar para humano. Sem banco e
// sem HTTP, para ser testável e não repetir a lógica em cada watcher.

/** Estados internos que representam "pago mas ainda não entregue ao fornecedor". */
export const QUEUE_STATUSES = ["waiting_provision", "MARGIN_HOLD", "SMM_FAILED"] as const;

/** Espera antes da 1ª retentativa automática — dá tempo do dispatch inline terminar. */
export const QUEUE_MIN_AGE_MIN = 15;

/** Backoff entre retentativas (minutos), por número de tentativas já feitas. */
export const QUEUE_BACKOFF_MIN = [15, 30, 60, 120, 240];

/**
 * v353 — pedido parado só por falta de saldo no fornecedor não pode desistir em
 * ~8h. O dono recarrega rápido, mas pode acontecer movimento grande e demorar.
 * Regra declarada: a fila insiste sozinha por ~24h antes de chamar humano.
 */
export const QUEUE_BACKOFF_WAITING_MIN = [15, 30, 60, 120, 240, 240, 240, 240, 240, 240];

/** Depois disso, para de tentar sozinho e chama humano. */
export const QUEUE_MAX_ATTEMPTS = QUEUE_BACKOFF_MIN.length;

/** Teto de tentativas para pedido aguardando recarga (~24h de insistência). */
export const QUEUE_MAX_ATTEMPTS_WAITING = QUEUE_BACKOFF_WAITING_MIN.length;

function tabela(status: string) {
  return status === "waiting_provision"
    ? { backoff: QUEUE_BACKOFF_WAITING_MIN, max: QUEUE_MAX_ATTEMPTS_WAITING }
    : { backoff: QUEUE_BACKOFF_MIN, max: QUEUE_MAX_ATTEMPTS };
}


export type QueueItem = {
  id: string;
  status: string;
  created_at: string;
  /** Tentativas automáticas já feitas (reutiliza pedidos.reconcile_attempts). */
  attempts: number;
  /** Última tentativa automática (reutiliza pedidos.last_reconciled_at). */
  last_attempt_at: string | null;
};

export type QueueDecision =
  | { action: "retry"; reason: string }
  | { action: "escalate"; reason: string }
  | { action: "wait"; reason: string };

export function decideQueueAction(item: QueueItem, now: number = Date.now()): QueueDecision {
  const idadeMin = (now - new Date(item.created_at).getTime()) / 60_000;

  if (idadeMin < QUEUE_MIN_AGE_MIN) {
    return { action: "wait", reason: `pedido novo (${Math.round(idadeMin)}min) — dispatch inline ainda pode resolver` };
  }

  if (item.attempts >= QUEUE_MAX_ATTEMPTS) {
    return { action: "escalate", reason: `${item.attempts} tentativas automáticas sem sucesso` };
  }

  const esperaMin = QUEUE_BACKOFF_MIN[Math.min(item.attempts, QUEUE_BACKOFF_MIN.length - 1)];
  const desdeUltima = item.last_attempt_at
    ? (now - new Date(item.last_attempt_at).getTime()) / 60_000
    : Infinity;

  if (desdeUltima < esperaMin) {
    return {
      action: "wait",
      reason: `aguardando backoff (${Math.round(desdeUltima)}min de ${esperaMin}min)`,
    };
  }

  return { action: "retry", reason: `tentativa ${item.attempts + 1} de ${QUEUE_MAX_ATTEMPTS}` };
}
