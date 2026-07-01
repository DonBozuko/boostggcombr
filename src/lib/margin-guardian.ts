// v91 — Strict Margin Guardian Engine
// Fórmula perpétua de venda:
//   price = cost_brl * PROFIT_MULT * COUPON_BUFFER / PIX_NET
// - PROFIT_MULT = 4.0  → garante 300% de lucro real (custo × 4)
// - COUPON_BUFFER = 1.15 → absorve o cupom PRIME15
// - PIX_NET = 0.9901 → repassa a taxa MP Pix de 0.99% p/ o cliente

export const PROFIT_MULT = 4.0;
export const COUPON_BUFFER = 1.15;
export const PIX_NET = 0.9901;
export const MIN_NET_PROFIT_RATIO = 3.0; // 300% líquido

export function computeGuardedPrice(costBrl: number): number {
  const c = Number(costBrl);
  if (!Number.isFinite(c) || c <= 0) return 0;
  return Number(((c * PROFIT_MULT * COUPON_BUFFER) / PIX_NET).toFixed(2));
}

/** Lucro líquido estimado após cupom PRIME15 (15%) + taxa Pix (0.99%). */
export function estimateNetProfit(priceBrl: number, costBrl: number): number {
  const grossAfterCoupon = priceBrl / COUPON_BUFFER; // preço sem gordura do cupom
  const afterPix = grossAfterCoupon * PIX_NET;
  return Number((afterPix - costBrl).toFixed(4));
}

/** true se o custo atual respeita a trava de 300% de lucro líquido. */
export function respectsMinMargin(priceBrl: number, costBrl: number): boolean {
  if (!(costBrl > 0)) return false;
  const net = estimateNetProfit(priceBrl, costBrl);
  return net / costBrl >= MIN_NET_PROFIT_RATIO;
}
