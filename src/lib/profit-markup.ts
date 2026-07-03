// v168 — Strict Margin Guard client-safe. Aplica multiplicador tier + buffer PRIME15
// + taxa Pix MP fixa (R$ 0,49). Piso mínimo R$ 5,00.

const COUPON_BUFFER = 1.15;
const PIX_NET = 0.9901;
const PIX_FIXED = 0.49;
const FLOOR_BRL = 5.0;

function tierMultiplier(qty: number): number {
  if (qty <= 1000) return 4.0;
  if (qty <= 10000) return 2.6;
  return 1.8;
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

