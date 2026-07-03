// v173 — Strict Tiered Margin Guard client-safe. Multiplicador escalonado
// por quantidade + buffer PRIME15 + taxa Pix MP fixa. Piso R$ 5,00.

const COUPON_BUFFER = 1.15;
const PIX_NET = 0.9901;
const PIX_FIXED = 0.49;
const FLOOR_BRL = 5.0;

function tierMultiplier(qty: number): number {
  // v173: escalonado — mesmo desconto PRIME15, margem compensada por faixa.
  //   qty ≤ 500        → 5.0x  (isca de topo)
  //   qty ≤ 10.000     → 8.0x  (sweet spot varejo)
  //   qty > 10.000     → 12.0x (premium/autoridade)
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 500) return 5.0;
  if (q <= 10_000) return 8.0;
  return 12.0;
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
    const raw = (cost * tierMultiplier(qty) * COUPON_BUFFER + PIX_FIXED) / PIX_NET;
    const final = Math.max(FLOOR_BRL, ceilTo(raw, 0.5));
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

