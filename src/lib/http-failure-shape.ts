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

export type FailureShape = {
  erros: number;
  minutosDistintos: number;
};

export type FailureVerdict = "silencio" | "pico_de_atualizacao" | "falha_continua";

/** Mínimo de erros na janela para sequer olhar o formato. */
export const FAILURE_MIN_HITS = 3;
/** Minutos distintos com erro que caracterizam falha real (não deploy). */
export const FAILURE_MIN_MINUTES = 2;

export function classifyHttpFailures(shape: Partial<FailureShape> | null | undefined): FailureVerdict {
  const erros = Number(shape?.erros ?? 0);
  const minutos = Number(shape?.minutosDistintos ?? 0);
  if (!Number.isFinite(erros) || erros < FAILURE_MIN_HITS) return "silencio";
  if (!Number.isFinite(minutos) || minutos < FAILURE_MIN_MINUTES) return "pico_de_atualizacao";
  return "falha_continua";
}
