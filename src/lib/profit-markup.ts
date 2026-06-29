// High-CAC Anti-Fee Pricing Matrix — client-safe markup.
// Aplica multiplicador por faixa de volume e divide por 0.85 (buffer PRIME15)
// sobre o `valor` base tratado como custo. Unifica com o motor server.

const COUPON_BUFFER = 0.85; // 1 - 0.15 (PRIME15)

function tierMultiplier(qty: number): number {
  if (qty <= 1000) return 4.5;
  if (qty <= 10000) return 3.2;
  return 2.2;
}

const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step;

export function formatBRL(v: number): string {
  const [int, dec] = v.toFixed(2).split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${withSep},${dec}`;
}

export function applyProfitFormula<T extends { valor: number; price: string; quantidade?: number }>(
  plans: ReadonlyArray<T>,
): T[] {
  return plans.map((p) => {
    const cost = parseFloat(String(p.valor));
    const qty = Number(p.quantidade ?? 0);
    const raw = (cost * tierMultiplier(qty)) / COUPON_BUFFER;
    const final = Math.max(3, ceilTo(raw, 0.5));
    return { ...p, valor: final, price: formatBRL(final) };
  });
}
