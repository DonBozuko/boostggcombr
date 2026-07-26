// v261 — Preço de revenda (API para revendedores).
//
// Regra de ouro comercial: o desconto do revendedor sai SEMPRE da margem
// existente, nunca do custo, e nunca abaixo de um piso de lucro. O preço de
// varejo do site NÃO muda — subir o varejo pra "pagar" a revenda destruiria o
// CTR e a conversão que já foram conquistados.
//
// Economia do revendedor difere do varejo:
//  - não usa cupom PRIME15 (sem COUPON_BUFFER a absorver)
//  - não paga taxa fixa Pix por pedido (o depósito é uma transação só)
// Por isso o piso de lucro aqui é 2,5× o custo (varejo exige 4×) e ainda assim
// o lucro absoluto por pedido continua positivo e auditável.

export const PIX_NET = 0.9901;
/** Teto duro de desconto por revendedor. Nada acima disso é aceito. */
export const RESELLER_MAX_DISCOUNT = 0.30;
/** Piso de lucro na revenda: líquido ≥ 2,5× o custo do fornecedor. */
export const RESELLER_MIN_RATIO = 2.5;

/** Lucro líquido estimado de um pedido de revenda. */
export function resellerNetProfit(priceBrl: number, costBrl: number): number {
  return Number((Number(priceBrl) * PIX_NET - Number(costBrl)).toFixed(4));
}

export function resellerRespectsMinMargin(priceBrl: number, costBrl: number): boolean {
  const c = Number(costBrl);
  if (!(c > 0)) return false;
  return resellerNetProfit(priceBrl, c) / c >= RESELLER_MIN_RATIO;
}

/** Maior desconto possível sobre o preço de varejo sem furar o piso de lucro. */
export function maxAllowedDiscount(catalogPrice: number, costBrl: number): number {
  const p = Number(catalogPrice);
  const c = Number(costBrl);
  if (!(p > 0)) return 0;
  if (!(c > 0)) return 0; // custo desconhecido → nenhum desconto (fail-closed)
  const keep = ((1 + RESELLER_MIN_RATIO) * c) / (p * PIX_NET); // fração do preço a manter
  const allowed = 1 - keep;
  if (!Number.isFinite(allowed) || allowed <= 0) return 0;
  return Math.min(RESELLER_MAX_DISCOUNT, Number(allowed.toFixed(4)));
}

export type ResellerQuote = {
  /** Preço final que o revendedor paga (debitado do saldo). */
  price: number;
  /** Preço público de varejo (referência pra ele revender por cima). */
  retail: number;
  /** Desconto efetivamente aplicado (pode ser menor que o contratado). */
  discount: number;
  /** true = desconto foi reduzido pelo piso de margem. */
  clamped: boolean;
};

/**
 * Cotação de revenda. Nunca devolve preço que fure o piso de lucro.
 * Sem custo conhecido → devolve preço de varejo cheio (fail-closed).
 */
export function quoteReseller(input: {
  catalogPrice: number;
  costBrl: number;
  descontoPct: number;
}): ResellerQuote {
  const retail = Number(Number(input.catalogPrice).toFixed(2));
  const wanted = Math.max(0, Math.min(RESELLER_MAX_DISCOUNT, Number(input.descontoPct) || 0));
  const allowed = maxAllowedDiscount(retail, input.costBrl);
  const discount = Math.min(wanted, allowed);
  const price = Number((retail * (1 - discount)).toFixed(2));
  return {
    price,
    retail,
    discount: Number(discount.toFixed(4)),
    clamped: discount < wanted - 1e-9,
  };
}
