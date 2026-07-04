// v173 — Strict Tiered Margin Guard
// Fórmula perpétua de venda (com taxa fixa Pix MP de R$ 0,49):
//   price = (cost_brl * PROFIT_MULT * tierFactor(qty) * COUPON_BUFFER + PIX_FIXED) / PIX_NET
// - PROFIT_MULT base = 5.0 (piso 400% lucro; trigger DB enforce_pricing_markup)
// - Tier factor por quantidade (v173):
//     qty ≤ 500        → 1.0  (efetivo 5.0x  — isca de topo)
//     qty ≤ 10.000     → 1.6  (efetivo 8.0x  — sweet spot varejo)
//     qty > 10.000     → 2.4  (efetivo 12.0x — premium/autoridade)
// - COUPON_BUFFER = 1.15 → absorve o cupom PRIME15 sem sangrar margem
// - PIX_NET = 0.9901    → líquido após taxa percentual MP Pix (0,99%)
// - PIX_FIXED = 0.49    → taxa FIXA MP Pix por transação
// - FLOOR = R$ 5,00     → piso mínimo absoluto

export const PROFIT_MULT = 5.0; // base preservada — trigger DB usa este piso
export const COUPON_BUFFER = 1.15;
export const PIX_NET = 0.9901;
export const PIX_FIXED = 0.49;
export const FLOOR_BRL = 5.0;
export const MIN_NET_PROFIT_RATIO = 4.0; // validação: net ≥ 4× custo

/** v174 — Fator escalar com rampa linear entre 5k e 15k (elimina degrau abrupto). */
export function tierFactor(qty: number): number {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 500) return 1.0;   // 5.0x  — isca
  if (q <= 5_000) return 1.6;                         // 8.0x  — sweet spot
  if (q <= 15_000) {
    // Rampa linear 8x → 12x entre 5k e 15k (evita zona morta comercial)
    return 1.6 + ((q - 5000) / 10000) * 0.8;
  }
  return 2.4;                                         // 12.0x — premium
}

/** v174 — Multiplicador efetivo de lucro para uma quantidade. */
export function effectiveProfitMult(qty: number): number {
  return PROFIT_MULT * tierFactor(qty);
}

/**
 * v175 — Piso escalar contínuo desde qty=50 (elimina achatamento visual
 * do piso fixo R$5 nos pacotes pequenos). Progressão crível para o cliente:
 *   qty  50     → R$ 5,00
 *   qty 100     → R$ 5,89
 *   qty 200     → R$ 7,67
 *   qty 500     → R$ 13,00
 *   qty 1.000   → R$ 14,00
 *   qty 3.000   → R$ 18,00
 *   qty 10.000  → R$ 32,00
 * Monotônico e sempre ≥ FLOOR_BRL. Nunca reduz preço (formula > floor prevalece).
 */
export function scaledFloor(qty: number): number {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 50) return FLOOR_BRL;
  if (q <= 500) {
    // Rampa linear 50→500 seguidores: R$5 → R$13 (+R$8 em 450 qty)
    return FLOOR_BRL + ((q - 50) / 450) * 8.0;
  }
  // Acima de 500: R$13 base + R$2 por mil (rampa antiga preservada)
  return 13.0 + ((q - 500) / 1000) * 2.0;
}





export function computeGuardedPrice(costBrl: number, qty = 0): number {
  const c = Number(costBrl);
  if (!Number.isFinite(c) || c <= 0) return 0;
  const raw = (c * effectiveProfitMult(qty) * COUPON_BUFFER + PIX_FIXED) / PIX_NET;
  return Number(Math.max(scaledFloor(qty), raw).toFixed(2));
}


/** Líquido após cupom PRIME15 (15%) + taxa MP Pix (0,99% + R$ 0,49). */
export function estimateNetProfit(priceBrl: number, costBrl: number): number {
  const grossAfterCoupon = priceBrl / COUPON_BUFFER;
  const afterPix = grossAfterCoupon * PIX_NET - PIX_FIXED;
  return Number((afterPix - costBrl).toFixed(4));
}

export function respectsMinMargin(priceBrl: number, costBrl: number): boolean {
  if (!(costBrl > 0)) return false;
  const net = estimateNetProfit(priceBrl, costBrl);
  return net / costBrl >= MIN_NET_PROFIT_RATIO;
}
