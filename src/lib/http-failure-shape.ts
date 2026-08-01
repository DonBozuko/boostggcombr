// v388 — Formato da falha: pico único x falha contínua.
//
// Contexto real (31/07): 20 respostas 500 numa janela de 10 minutos, todas
// carimbadas em 3 instantes exatos (:00, :05, :10) e nenhuma delas chegou no
// log do site. Isso é o Cloudflare devolvendo erro enquanto a nova versão
// publicada entra no ar — o robô repete em ≤5min e nada se perde.
// Falha real de rota erra em MINUTOS DIFERENTES, seguidamente.
//
// Regra: só é alarme se houver erro em pelo menos 2 minutos distintos dentro
// da janela. Um único instante = pico de atualização, vira aviso leve.

// v402 — Reforço: "2 minutos distintos" não bastava.
// Caso real (01/08, 18:00-18:02): 6 crons dispararam no MESMO segundo durante a
// publicação e 1 retentativa caiu em 18:02. Deu 2 minutos distintos → o sistema
// gritou "rota quebrada" quando na verdade era o site trocando de versão.
// Das 18:05 às 19:03 não houve UM erro sequer.
// Regra nova: falha de verdade erra por uma FAIXA de tempo, não num pisco.
// Exige espalhamento mínimo entre o primeiro e o último erro.

export type FailureShape = {
  erros: number;
  minutosDistintos: number;
  /** Minutos entre o primeiro e o último erro da janela. */
  duracaoMinutos?: number;
};

export type FailureVerdict = "silencio" | "pico_de_atualizacao" | "falha_continua";

/** Mínimo de erros na janela para sequer olhar o formato. */
export const FAILURE_MIN_HITS = 3;
/** Minutos distintos com erro que caracterizam falha real (não deploy). */
export const FAILURE_MIN_MINUTES = 2;
/** Faixa mínima (1º ao último erro) para não ser rajada de publicação. */
export const FAILURE_MIN_SPREAD_MIN = 5;

export function classifyHttpFailures(shape: Partial<FailureShape> | null | undefined): FailureVerdict {
  const erros = Number(shape?.erros ?? 0);
  const minutos = Number(shape?.minutosDistintos ?? 0);
  if (!Number.isFinite(erros) || erros < FAILURE_MIN_HITS) return "silencio";
  if (!Number.isFinite(minutos) || minutos < FAILURE_MIN_MINUTES) return "pico_de_atualizacao";

  // Sem informação de faixa, mantém o comportamento antigo (não regride).
  const bruto = shape?.duracaoMinutos;
  if (bruto == null) return "falha_continua";
  const duracao = Number(bruto);
  if (!Number.isFinite(duracao)) return "falha_continua";
  return duracao >= FAILURE_MIN_SPREAD_MIN ? "falha_continua" : "pico_de_atualizacao";
}

/** Faixa em minutos entre dois instantes ISO; null quando não dá para calcular. */
export function spreadInMinutes(primeiro?: string | null, ultimo?: string | null): number | null {
  if (!primeiro || !ultimo) return null;
  const a = new Date(primeiro).getTime();
  const b = new Date(ultimo).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.abs(b - a) / 60000;
}

