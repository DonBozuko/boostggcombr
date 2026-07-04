// v173 — Strict Tiered Margin Guard client-safe. Multiplicador escalonado
// por quantidade + buffer PRIME15 + taxa Pix MP fixa. Piso R$ 5,00.

const COUPON_BUFFER = 1.15;
const PIX_NET = 0.9901;
const PIX_FIXED = 0.49;
const FLOOR_BRL = 5.0;

function tierMultiplier(qty: number): number {
  // v174: rampa linear entre 5k e 15k elimina degrau de +50% no preço/mil.
  //   qty ≤ 500        → 5.0x  (isca)
  //   qty ≤ 5.000      → 8.0x  (sweet spot)
  //   qty 5k → 15k     → 8.0x → 12.0x (rampa linear)
  //   qty > 15.000     → 12.0x (premium)
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 500) return 5.0;
  if (q <= 5_000) return 8.0;
  if (q <= 15_000) return 8.0 + ((q - 5000) / 10000) * 4.0;
  return 12.0;
}

// v176 — Piso escalar contínuo com rampa suavizada 500→2000.
function scaledFloor(qty: number): number {
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 50) return FLOOR_BRL;
  if (q <= 500) return FLOOR_BRL + ((q - 50) / 450) * 8.0;
  if (q <= 2000) return 13.0 + ((q - 500) / 1500) * 5.0;
  return 18.0 + ((q - 2000) / 1000) * 2.0;
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
    const final = Math.max(scaledFloor(qty), ceilTo(raw, 0.5));
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

