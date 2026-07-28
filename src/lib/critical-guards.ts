// v243 — Regras críticas isoladas em funções puras para poderem ser TESTADAS.
// Nada aqui toca banco, rede ou env. É a única fonte de verdade das travas
// que causaram prejuízo real (caso Sybele: pacote BR entregue com perfil
// estrangeiro por causa de um ID auto-resolvido internacional).

export const TOXIC_SERVICE_RE = /n[aã]o\s*compre|queda\s*de\s*100|100%\s*de?\s*queda|drop\s*100/i;
export const BR_SERVICE_RE = /brasil|brazil|brasileir|🇧🇷/i;

/** Pacote é brasileiro? (category `...:br`, ou prefixo `br-` / `wbr`) */
export function isBrPackage(pacote: string, category?: string | null): boolean {
  const cat = String(category ?? "");
  const p = String(pacote ?? "");
  return cat.endsWith(":br") || p.startsWith("br-") || p.startsWith("wbr");
}

/** Serviço marcado pelo próprio fornecedor como queda total / não recomendado. */
export function isToxicService(name?: string | null, category?: string | null): boolean {
  return TOXIC_SERVICE_RE.test(`${name ?? ""} ${category ?? ""}`);
}

/**
 * v246 — Moeda nativa do fornecedor.
 * SMMhype cobra em USD (rate × cotação = BRL). SMMPainel, Verified Atacado e
 * demais painéis brasileiros já cobram em BRL — multiplicar pela cotação
 * inflava o custo ~5x e podia travar venda por margem / escolher fornecedor errado.
 */
export function isBrlNativeProvider(slug?: string | null): boolean {
  return /smmpainel|smm[-_ ]?panel|verified|provider4/i.test(String(slug ?? ""));
}

/** Cotação efetiva a aplicar sobre o rate do fornecedor. */
export function effectiveFx(slug: string | null | undefined, cotacao: number): number {
  return isBrlNativeProvider(slug) ? 1 : cotacao;
}

/**
 * Um fornecedor pode entregar este pacote?
 * Em pacote BR: só se o serviço for comprovadamente brasileiro, não-tóxico
 * e, quando requireRefill=true, tiver reposição (refill) garantida.
 * Sem catálogo em cache (`svc === null`): não bloqueia — evita parar venda.
 */
export function providerCanServe(opts: {
  brPackage: boolean;
  svc: { name?: string | null; category?: string | null; refill?: boolean | null } | null;
  requireRefill?: boolean;
}): boolean {
  if (!opts.svc) return true;
  const hay = `${opts.svc.name ?? ""} ${opts.svc.category ?? ""}`;
  if (TOXIC_SERVICE_RE.test(hay)) return false;
  if (opts.brPackage && !BR_SERVICE_RE.test(hay)) return false;
  // v245 — trava dura: em pacote BR, sem refill garantido = não despacha.
  if (opts.brPackage && opts.requireRefill && opts.svc.refill !== true) return false;
  return true;
}

/**
 * v351 — CUSTO SÓ VALE DE QUEM ENTREGA A QUANTIDADE.
 *
 * Causa raiz dos 9 pacotes "venderia no prejuízo": o motor de preço pegava o
 * MENOR custo entre os fornecedores vinculados sem olhar a faixa (min/max) do
 * serviço. Ex.: yv10m (10 milhões de views) foi precificado com o custo do
 * fornecedor cujo serviço aceita no máximo 1 milhão. Na hora do despacho o
 * roteamento descarta esse fornecedor (v286) e sobra só o caro — preço abaixo
 * do custo real, pacote pausado por margem em looping.
 *
 * Regra: quem não aceita a quantidade não entra na conta do custo. Faixa
 * desconhecida (0/ausente) não bloqueia — nunca parar venda por falta de dado.
 */
export function serviceAcceptsQty(
  svc: { min?: number | string | null; max?: number | string | null } | null | undefined,
  qty: number,
): boolean {
  if (!svc) return true;
  const q = Number(qty);
  if (!Number.isFinite(q) || q <= 0) return true;
  const min = Number(svc.min) || 0;
  const max = Number(svc.max) || 0;
  if (min > 0 && q < min) return false;
  if (max > 0 && q > max) return false;
  return true;
}

/**
 * Ordem de despacho. Regras, em ordem:
 * 1. Fornecedor instável vai pro fim.
 * 2. Em pacote BR, quem tem reposição (refill) ganha de quem não tem.
 * 3. Menor custo real.
 * 4. Desempate por cascata fixa.
 */
export type SortableProvider = {
  slug: string;
  unstable: boolean;
  cost_brl: number | null;
};

export function compareProviders(
  a: SortableProvider,
  b: SortableProvider,
  opts: { brPackage: boolean; refillMap: Record<string, boolean>; cascadeOrder: Record<string, number> },
): number {
  if (a.unstable !== b.unstable) return a.unstable ? 1 : -1;
  if (opts.brPackage) {
    const ar = opts.refillMap[a.slug] === true ? 0 : 1;
    const br = opts.refillMap[b.slug] === true ? 0 : 1;
    if (ar !== br) return ar - br;
  }
  const ac = a.cost_brl ?? Number.POSITIVE_INFINITY;
  const bc = b.cost_brl ?? Number.POSITIVE_INFINITY;
  if (ac !== bc) return ac - bc;
  return (opts.cascadeOrder[a.slug] ?? 99) - (opts.cascadeOrder[b.slug] ?? 99);
}
