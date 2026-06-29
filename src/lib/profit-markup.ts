// Strict 100% Profit + 15% Coupon Buffer — client-safe markup.
// Aplica (custo * 2.0) / 0.85 sobre o `valor` base (tratado como custo) e
// reescreve o `price` formatado em BRL. Usado em todas as rotas públicas
// derivadas para unificar com o motor server-side do Instagram.

const PROFIT_MULT = 2.0;
const COUPON_BUFFER = 0.85; // 1 - 0.15 (PRIME15)

function ceilTo(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function formatBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
    .replace("R$ .", "R$ ");
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
