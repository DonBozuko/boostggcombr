/**
 * v270 — Pagamento por cartão (Mercado Pago Checkout Pro).
 *
 * Regra de negócio decidida com o dono: a taxa do cartão é repassada ao cliente.
 * Pix continua sendo o "melhor preço" e a margem do Pix não muda em nada.
 *
 * Por que 7%: MP cobra ~4,98% no crédito (liberação D+30) e o cartão ainda
 * carrega risco de chargeback — que no nosso nicho (entrega intangível e
 * imediata) é perda total. Os 2 pontos extras são colchão desse risco.
 */
export const CARD_SURCHARGE = 0.07;

/**
 * Teto de valor liberado no cartão sem análise manual.
 * Fraude com cartão roubado costuma testar ticket alto: acima disso só Pix.
 */
export const CARD_MAX_BRL = 300;

/** Valor mínimo aceito pelo Mercado Pago em cartão. */
export const CARD_MIN_BRL = 5;

/** Preço no cartão = preço Pix + taxa repassada, arredondado para cima no centavo. */
export function cardAmount(pixAmount: number): number {
  // Number(...toFixed(4)) mata o ruído de ponto flutuante antes do arredondamento.
  const bruto = Number((pixAmount * (1 + CARD_SURCHARGE)).toFixed(4));
  return Math.ceil(bruto * 100) / 100;
}

export function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

export function cardBlockedReason(pixAmount: number): "CARD_LIMIT" | "CARD_MIN" | null {
  const total = cardAmount(pixAmount);
  if (total > CARD_MAX_BRL) return "CARD_LIMIT";
  if (total < CARD_MIN_BRL) return "CARD_MIN";
  return null;
}
