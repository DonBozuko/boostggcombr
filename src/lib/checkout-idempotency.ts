// v260 — Corrida de checkout (dois cliques simultâneos).
//
// O dedupe v218 lê o banco antes de criar o Pix. Isso só funciona quando o
// primeiro clique JÁ inseriu o pedido. Em cliques realmente simultâneos
// (mesmo segundo, duas requisições em paralelo) nenhuma das duas vê a outra
// no banco e o Mercado Pago recebia duas chamadas com X-Idempotency-Key
// aleatória → duas cobranças Pix para o mesmo cliente.
//
// Solução: a chave de idempotência deixa de ser aleatória e passa a ser
// derivada de (usuário + pacote + valor + janela de tempo). Requisições
// gêmeas geram a MESMA chave, então o próprio Mercado Pago devolve o
// mesmo pagamento em vez de criar outro. Retries continuam funcionando
// porque a chave é estável dentro da janela.

/** Janela de agrupamento: cliques dentro do mesmo bucket compartilham a chave. */
export const IDEMPOTENCY_WINDOW_MS = 90_000;

function slug(v: string): string {
  return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Chave determinística por (usuário, pacote, valor, janela de 90s).
 * Mesma intenção de compra → mesma chave → MP nunca cobra duas vezes.
 */
export function buildCheckoutIdempotencyKey(input: {
  usuario: string;
  pacote: string;
  valor: number;
  nowMs?: number;
  windowMs?: number;
}): string {
  const windowMs = input.windowMs ?? IDEMPOTENCY_WINDOW_MS;
  const now = input.nowMs ?? Date.now();
  const bucket = Math.floor(now / windowMs);
  const valor = Math.round((Number(input.valor) || 0) * 100);
  return `bgg-${slug(input.usuario)}-${slug(input.pacote)}-${valor}-${bucket}`;
}

/**
 * Pix vencido há muito tempo continua "pending" para sempre e o reconciliador
 * fica batendo no Mercado Pago a cada 5min por pedidos que nunca serão pagos.
 * Acima deste limite o pedido é encerrado como expirado.
 */
export const PENDING_MAX_AGE_HOURS = 24;

export function isStalePending(createdAtIso: string, nowMs = Date.now()): boolean {
  const t = Date.parse(createdAtIso);
  if (!Number.isFinite(t)) return false;
  return nowMs - t > PENDING_MAX_AGE_HOURS * 3_600_000;
}
