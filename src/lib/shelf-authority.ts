// v372 — Autoridade Única de Vitrine (parte pura).
//
// Antes desta versão, SEIS motores gravavam `pricing_items.is_sellable`
// direto (price-authority, bench-autonomo, catalog-coherence,
// service-fingerprint, route-preflight, dry-run). Cada um pausava por um
// critério e nenhum sabia do outro: um religava, o outro pausava de novo,
// e o alerta nunca "andava". É a mesma família de bug do preço (v305).
//
// Regra nova: motor não decide, motor VOTA. Cada motor registra/retira o seu
// veto; só esta autoridade traduz vetos em `is_sellable`.
//
// Regra de rampa (v371): todo veto tem prazo de validade. Motor que continua
// vendo o problema renova o veto no ciclo seguinte. Motor que parou de ver o
// problema — ou que morreu — deixa o veto expirar e o pacote volta sozinho.
// Pausa sem contrapartida de retorno é bug.

export type ShelfSource =
  | "margem"        // price-authority: preço não fecha a margem mínima
  | "bancada"       // bench-autonomo: varredura de entrega
  | "coerencia"     // catalog-coherence: vínculo/produto incoerente
  | "impressao"     // service-fingerprint: fornecedor trocou o produto do id
  | "preflight"     // route-preflight: falha estrutural no instante da cobrança
  | "teste-seco"    // dry-run: fornecedor não reconhece o id / fora da faixa
  | "manual";       // dono pausou no admin

// Prazo padrão de cada origem. Origem de ciclo curto expira rápido (o motor
// renova em minutos); origem cara de recalcular expira devagar.
export const VETO_TTL_HORAS: Record<ShelfSource, number> = {
  margem: 6,
  bancada: 24,
  coerencia: 24,
  impressao: 48,
  preflight: 6,
  "teste-seco": 48,
  manual: 24 * 365,
};

export type ShelfVeto = {
  pacote: string;
  source: ShelfSource | string;
  motivo: string;
  expires_at: string;
};

export type ShelfDecision = {
  pacote: string;
  sellable: boolean;
  motivo: string | null;
  sources: string[];
};

export function vetoAtivo(v: ShelfVeto, agora = new Date()): boolean {
  const exp = Date.parse(v.expires_at);
  return Number.isFinite(exp) ? exp > agora.getTime() : true;
}

// Ordem de exibição: o motivo mostrado ao dono é o do veto mais "duro".
const PRIORIDADE: string[] = [
  "manual",
  "impressao",
  "coerencia",
  "teste-seco",
  "preflight",
  "bancada",
  "margem",
];

function peso(source: string): number {
  const i = PRIORIDADE.indexOf(source);
  return i === -1 ? PRIORIDADE.length : i;
}

/**
 * Traduz a lista de vetos em decisão de vitrine para cada pacote informado.
 * Pacote sem veto ativo volta à vitrine — sempre. Não existe pausa órfã.
 */
export function decidirVitrine(
  pacotes: string[],
  vetos: ShelfVeto[],
  agora = new Date(),
): ShelfDecision[] {
  const porPacote = new Map<string, ShelfVeto[]>();
  for (const v of vetos) {
    if (!vetoAtivo(v, agora)) continue;
    const lista = porPacote.get(v.pacote) ?? [];
    lista.push(v);
    porPacote.set(v.pacote, lista);
  }

  const alvos = pacotes.length > 0 ? [...new Set(pacotes)] : [...porPacote.keys()];

  return alvos.map((pacote) => {
    const ativos = (porPacote.get(pacote) ?? []).slice().sort((a, b) => peso(a.source) - peso(b.source));
    if (ativos.length === 0) {
      return { pacote, sellable: true, motivo: null, sources: [] };
    }
    return {
      pacote,
      sellable: false,
      motivo: ativos[0].motivo.slice(0, 400),
      sources: ativos.map((v) => v.source),
    };
  });
}
