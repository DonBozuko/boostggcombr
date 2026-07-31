// v325 — MAPA CANÔNICO DE STATUS (decisão pura).
//
// Por que existe: o banco acumulou ~20 valores de `pedidos.status` ao longo de
// 300 versões (pending, paid, Enviado, waiting_provision, MARGIN_HOLD,
// SMM_FAILED, mp_refunded, amount_mismatch, expired…). Cada tela inventava a
// própria tradução, e status novo entrava sem ninguém perceber.
//
// Renomear no banco quebraria reconciliador, watchers, histórico e painel.
// A saída correta é a mesma dos painéis grandes: manter os estados internos
// (ricos, para diagnóstico) e ter UM tradutor para os 8 estados públicos.
//
// Puro de propósito: sem banco, sem HTTP. Testável e ponto único de verdade.

export const CANONICAL_STATUSES = [
  "PENDENTE",
  "PAGO",
  "EM_PROCESSAMENTO",
  "ENVIADO_AO_FORNECEDOR",
  "EM_ENTREGA",
  "CONCLUIDO",
  "CANCELADO",
  "ERRO",
] as const;

export type CanonicalStatus = (typeof CANONICAL_STATUSES)[number];

/**
 * Estados internos conhecidos → estado canônico.
 * Toda chave aqui é um valor que EXISTE no banco hoje. Status interno novo que
 * não estiver neste mapa cai em "ERRO" e é apanhado pelo teste-trava.
 */
const MAP: Record<string, CanonicalStatus> = {
  // aguardando pagamento
  pending: "PENDENTE",
  mp_pending: "PENDENTE",
  mp_in_process: "PENDENTE",
  mp_authorized: "PENDENTE",
  novo: "PENDENTE",

  // pago, ainda não despachado
  paid: "PAGO",
  approved: "PAGO",
  aprovado: "PAGO",
  mp_approved: "PAGO",
  recuperado: "PAGO",

  // pago e na fila interna (aguardando rota/saldo/margem)
  waiting_provision: "EM_PROCESSAMENTO",
  provisioning: "EM_PROCESSAMENTO",
  provisioned: "EM_PROCESSAMENTO",
  MARGIN_HOLD: "EM_PROCESSAMENTO",
  contingency_hold: "EM_PROCESSAMENTO",
  crediting: "EM_PROCESSAMENTO",
  simulated: "EM_PROCESSAMENTO",

  // já saiu para o fornecedor
  Enviado: "ENVIADO_AO_FORNECEDOR",
  dispatched: "ENVIADO_AO_FORNECEDOR",

  // fornecedor executando
  processing: "EM_ENTREGA",
  in_progress: "EM_ENTREGA",
  partial: "EM_ENTREGA",

  // fim feliz
  completed: "CONCLUIDO",
  delivered: "CONCLUIDO",
  credited: "CONCLUIDO",

  // encerrado sem entrega, sem culpa técnica
  cancelled: "CANCELADO",
  canceled: "CANCELADO",
  expired: "CANCELADO",
  rejected: "CANCELADO",
  mp_cancelled: "CANCELADO",
  mp_expired: "CANCELADO",
  mp_rejected: "CANCELADO",
  mp_rejected_insufficient: "CANCELADO",
  mp_refunded: "CANCELADO",
  mp_charged_back: "CANCELADO",
  refunded: "CANCELADO",
  descartado: "CANCELADO",

  // falha que precisa de olho humano ou robô
  failed: "ERRO",
  SMM_FAILED: "ERRO",
  AWAITING_REFUND_APPROVAL: "ERRO",
  error: "ERRO",
  amount_mismatch: "ERRO",
  mp_unknown: "ERRO",
};

/** Estados internos que o sistema reconhece hoje. Usado pelo teste-trava. */
export const KNOWN_INTERNAL_STATUSES = Object.keys(MAP);

/** Consulta de banco sem listas paralelas: deriva os estados internos do mapa canônico. */
export function internalStatusesFor(...canonical: CanonicalStatus[]): string[] {
  const accepted = new Set<CanonicalStatus>(canonical);
  return Object.entries(MAP)
    .filter(([, status]) => accepted.has(status))
    .map(([internal]) => internal);
}

export function toCanonicalStatus(internal: string | null | undefined): CanonicalStatus {
  if (!internal) return "PENDENTE";
  const direct = MAP[internal];
  if (direct) return direct;
  // tolerância de caixa: 'ENVIADO' / 'enviado' / 'Paid'
  const hit = Object.keys(MAP).find((k) => k.toLowerCase() === internal.toLowerCase());
  return hit ? MAP[hit] : "ERRO";
}

export function isKnownInternalStatus(internal: string): boolean {
  return Object.keys(MAP).some((k) => k.toLowerCase() === internal.toLowerCase());
}

/** Frase para o cliente. Nunca cita fornecedor, custo ou detalhe interno. */
const LABEL_PT: Record<CanonicalStatus, string> = {
  PENDENTE: "Aguardando a confirmação do seu pagamento.",
  PAGO: "Pagamento confirmado. Preparando o envio.",
  EM_PROCESSAMENTO: "Pagamento confirmado. Seu pedido está na fila de envio.",
  ENVIADO_AO_FORNECEDOR: "Pedido enviado. A entrega já começou a ser processada.",
  EM_ENTREGA: "Entrega em andamento.",
  CONCLUIDO: "Pedido entregue com sucesso.",
  CANCELADO: "Pedido encerrado sem entrega. Se houve cobrança, o valor é devolvido.",
  ERRO: "Tivemos um problema neste pedido. Nossa equipe já foi avisada.",
};

export function statusLabelPt(internal: string | null | undefined): string {
  return LABEL_PT[toCanonicalStatus(internal)];
}

/** Estados em que o dinheiro já entrou e a entrega ainda não terminou. */
export function isOpenPaidStatus(internal: string | null | undefined): boolean {
  const c = toCanonicalStatus(internal);
  return c === "PAGO" || c === "EM_PROCESSAMENTO" || c === "ENVIADO_AO_FORNECEDOR" || c === "EM_ENTREGA";
}
