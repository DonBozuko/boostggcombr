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
export const MIN_NET_PROFIT_RATIO = 4.0; // validação: net ≥ 4× custo (custo baixo)

// v328 — MARKUP DECRESCENTE POR CUSTO (causa raiz do YouTube/Telegram mortos).
//
// O múltiplo fixo por QUANTIDADE (5x→12x) só funciona quando o custo é
// centavos. Medido no banco: 1.000 seguidores Instagram custam R$ 1,93 (5x =
// R$ 11, competitivo), mas 1.000 inscritos YouTube custam R$ 41,96 — 12x daria
// R$ 624 num mercado que cobra ~R$ 120. Múltiplo alto sobre custo alto não é
// margem: é prateleira morta (0 venda em 120 dias acima de 1.000 un).
//
// Regra nova: o múltiplo cai conforme o CUSTO ABSOLUTO sobe. Interpolação
// logarítmica (nunca em degraus) para que o preço total continue crescendo com
// a quantidade — degrau criaria pacote maior mais barato e brigaria com a
// escada monotônica (v292).
//   custo ≤ R$ 5    → 5,0x   (ticket pequeno: Instagram/Facebook intactos)
//   R$ 50           → 3,5x
//   R$ 300          → 2,6x
//   custo ≥ R$ 1000 → 2,0x   (piso — lucro absoluto continua alto)
const COST_TIER_FLOOR_MULT = 2.0;

function lerpLog(c: number, a: number, b: number, ma: number, mb: number): number {
  return ma * Math.pow(mb / ma, Math.log(c / a) / Math.log(b / a));
}

/** Múltiplo máximo de markup permitido para um custo absoluto. */
export function costTierMult(costBrl: number): number {
  const c = Number(costBrl);
  if (!Number.isFinite(c) || c <= 5) return PROFIT_MULT;
  if (c <= 50) return lerpLog(c, 5, 50, 5.0, 3.5);
  if (c <= 300) return lerpLog(c, 50, 300, 3.5, 2.6);
  if (c <= 1000) return lerpLog(c, 300, 1000, 2.6, COST_TIER_FLOOR_MULT);
  return COST_TIER_FLOOR_MULT;
}

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

/**
 * v174/v328 — Multiplicador efetivo de lucro.
 * O escalonamento por quantidade continua valendo, mas nunca ultrapassa o teto
 * de markup do custo absoluto (o que estava matando categorias caras).
 */
export function effectiveProfitMult(qty: number, costBrl = 0): number {
  const porQuantidade = PROFIT_MULT * tierFactor(qty);
  const c = Number(costBrl);
  if (!Number.isFinite(c) || c <= 0) return porQuantidade;
  return Math.min(porQuantidade, costTierMult(c));
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
    // Rampa 50→500: R$5 → R$13
    return FLOOR_BRL + ((q - 50) / 450) * 8.0;
  }
  if (q <= 2000) {
    // v176 — Rampa suavizada 500→2000: R$13 → R$18 (progressão crível)
    return 13.0 + ((q - 500) / 1500) * 5.0;
  }
  // Acima de 2000: R$18 base + R$2 por mil
  return 18.0 + ((q - 2000) / 1000) * 2.0;
}






export function computeGuardedPrice(costBrl: number, qty = 0): number {
  const c = Number(costBrl);
  if (!Number.isFinite(c) || c <= 0) return 0;
  // v267 — a taxa fixa do Pix também entra dentro do buffer do cupom. Antes ela
  // ficava fora, e o preço resultante ficava ~0,6% abaixo do necessário para o
  // lucro líquido de 4x — o que fazia a própria validação de margem reprovar o
  // preço que este motor tinha acabado de calcular (pacote pausado eternamente).
  const raw = ((c * effectiveProfitMult(qty, c) + PIX_FIXED) * COUPON_BUFFER) / PIX_NET;
  const guarded = Math.max(scaledFloor(qty), raw);
  return Number((Math.ceil(guarded * 100) / 100).toFixed(2));
}


/** Líquido após cupom PRIME15 (15%) + taxa MP Pix (0,99% + R$ 0,49). */
export function estimateNetProfit(priceBrl: number, costBrl: number): number {
  const grossAfterCoupon = priceBrl / COUPON_BUFFER;
  const afterPix = grossAfterCoupon * PIX_NET - PIX_FIXED;
  return Number((afterPix - costBrl).toFixed(4));
}

/**
 * v328 — lucro líquido mínimo exigido, em múltiplos do custo.
 * Acompanha o markup por faixa de custo: exigir 4x líquido num pacote de custo
 * R$ 4.196 é o que mantinha o preço em R$ 24 mil e o pacote invendável.
 * O preço guardado entrega exatamente (mult − 1) de lucro; 2% de folga cobre
 * arredondamento de centavos.
 */
export function minNetRatio(costBrl: number): number {
  const c = Number(costBrl);
  if (!Number.isFinite(c) || c <= 5) return MIN_NET_PROFIT_RATIO;
  return (costTierMult(c) - 1) * 0.98;
}

/**
 * v348 — TOLERÂNCIA DE CENTAVO (fim do falso "venderia no prejuízo").
 * Caso real: br-tf100 custo R$ 1,1508 → o próprio motor gerou preço R$ 7,25 e
 * a trava reprovou por 0,0007 de razão (arredondamento de centavo no preço
 * gravado). Resultado: pacote lucrativo (4x líquido) saía da vitrine sozinho.
 * 0,2% de folga não cria prejuízo nenhum e elimina a auto-contradição.
 */
// v360 — a folga cobre também o DRIFT DE TARIFA do fornecedor entre o momento
// em que o preço foi formado e o momento em que a Bancada julga a margem
// (br-tf100: custo gravado R$ 1,15 x tarifa lida R$ 1,16 = 0,87% → pacote
// lucrativo saía da vitrine sozinho). 1,5% de folga sobre um lucro de 4x não
// cria prejuízo nenhum; o ciclo de preço seguinte reajusta o preço de verdade.
const MARGIN_EPSILON = 0.985;


export function respectsMinMargin(priceBrl: number, costBrl: number): boolean {
  if (!(costBrl > 0)) return false;
  const net = estimateNetProfit(priceBrl, costBrl);
  return net / costBrl >= minNetRatio(costBrl) * MARGIN_EPSILON;
}

