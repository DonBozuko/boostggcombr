// v168 — Strict Margin Guard
// Fórmula perpétua de venda (com taxa fixa Pix MP de R$ 0,49):
//   price = (cost_brl * PROFIT_MULT * COUPON_BUFFER + PIX_FIXED) / PIX_NET
// - PROFIT_MULT = 4.0   → 300% de lucro real (custo × 4)
// - COUPON_BUFFER = 1.15 → absorve o cupom PRIME15
// - PIX_NET = 0.9901    → líquido após taxa percentual MP Pix (0,99%)
// - PIX_FIXED = 0.49    → taxa FIXA MP Pix por transação
// - FLOOR = R$ 5,00     → piso mínimo (evita micro-ticket sangrar margem)

export const PROFIT_MULT = 4.0;
export const COUPON_BUFFER = 1.15;
export const PIX_NET = 0.9901;
export const PIX_FIXED = 0.49;
export const FLOOR_BRL = 5.0;
export const MIN_NET_PROFIT_RATIO = 3.0; // 300% líquido

export function computeGuardedPrice(costBrl: number): number {
  const c = Number(costBrl);
  if (!Number.isFinite(c) || c <= 0) return 0;
  const raw = (c * PROFIT_MULT * COUPON_BUFFER + PIX_FIXED) / PIX_NET;
  return Number(Math.max(FLOOR_BRL, raw).toFixed(2));
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
