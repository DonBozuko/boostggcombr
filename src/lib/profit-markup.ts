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

// Strict 50-Pack Omnichannel Ingestion Matrix — gerador massivo de SKUs.
// Recebe prefixo (tf/tl/tv/ys/yv/ff/fl/tgc/tgg/wbr/wgl), label de unidade,
// custo BRL por 1000 e lista de quantidades. Devolve plans crus prontos para
// applyProfitFormula (valor = custo bruto, formula injeta markup High-CAC).
export type RawPlan = {
  id: string;
  tier: string;
  qty: string;
  quantidade: number;
  valor: number;
  price: string;
};

function qtyLabel(q: number): string {
  if (q >= 1_000_000) return `${q / 1_000_000}m`.replace(".", "_");
  if (q >= 1000) return `${q / 1000}k`.replace(".", "_");
  return String(q);
}

export function buildPlans(opts: {
  prefix: string;
  unitLabel: string;
  costPer1k: number;
  qtys: number[];
}): RawPlan[] {
  return opts.qtys.map((q) => {
    const cost = Math.max(1, (q / 1000) * opts.costPer1k);
    return {
      id: `${opts.prefix}${qtyLabel(q)}`,
      tier: `${q.toLocaleString("pt-BR")} ${opts.unitLabel}`,
      qty: String(q),
      quantidade: q,
      valor: cost,
      price: formatBRL(cost),
    };
  });
}

