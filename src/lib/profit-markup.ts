// Strict 100% Profit + 15% Coupon Buffer — client-safe markup.
// (custo * 2.0) / 0.85 sobre o `valor` base (tratado como custo) e reescreve
// o `price` formatado em BRL. Unifica rotas derivadas com o motor do Instagram.

const PROFIT_MULT = 2.0;
const COUPON_BUFFER = 0.85; // 1 - 0.15 (PRIME15)

const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step;

export function formatBRL(v: number): string {
  const [int, dec] = v.toFixed(2).split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${withSep},${dec}`;
}

export function applyProfitFormula<T extends { valor: number; price: string }>(
  plans: ReadonlyArray<T>,
): T[] {
  return plans.map((p) => {
    const cost = parseFloat(String(p.valor));
    const raw = (cost * PROFIT_MULT) / COUPON_BUFFER;
    const final = Math.max(3, ceilTo(raw, 0.5));
    return { ...p, valor: final, price: formatBRL(final) };
  });
}
