// v392 — TETO DA REPOSIÇÃO AUTOMÁTICA (nível 2 da escada de autonomia).
//
// Regra do nível 2: o sistema conserta sozinho, mas até um limite declarado.
// Nada de dinheiro saindo — reposição é cobrada do fornecedor, não do caixa.
// Parte PURA: decide, não executa. Assim dá pra provar sem tocar em rede.

/** No máximo isso de reposições automáticas por dia (o resto vira alerta). */
export const TETO_REPOSICOES_DIA = 10;

/** Só repõe automático quando faltou POUCO: até 10% do pedido. */
export const TETO_FALTA_PCT = 0.1;

/** Abaixo disso não vale a pena pedir reposição (ruído no fornecedor). */
export const MINIMO_FALTANDO = 1;

export type PedidoParaRepor = {
  quantidade: number;
  /** Quanto ainda falta entregar, segundo o fornecedor. */
  remains: number;
  /** Horas sem o contador de faltantes andar. */
  horasParado: number;
  /** Já pedimos reposição para este pedido antes? */
  jaPediu: boolean;
};

export type DecisaoReposicao =
  | { repor: true }
  | { repor: false; motivo: string };

export type ContextoReposicao = {
  /** admin_settings.autonomia_reposicao ligado? */
  flagLigada: boolean;
  /** Quantas reposições automáticas já saíram hoje. */
  reposicoesHoje: number;
  /** Horas paradas exigidas para considerar travado. */
  horasTravadoMin: number;
};

export function decidirReposicao(p: PedidoParaRepor, ctx: ContextoReposicao): DecisaoReposicao {
  if (!ctx.flagLigada) return { repor: false, motivo: "reposição automática desligada" };
  if (p.jaPediu) return { repor: false, motivo: "já pedimos reposição neste pedido" };
  if (ctx.reposicoesHoje >= TETO_REPOSICOES_DIA) {
    return { repor: false, motivo: `teto do dia atingido (${TETO_REPOSICOES_DIA})` };
  }
  if (!(p.quantidade > 0)) return { repor: false, motivo: "quantidade inválida" };
  if (!(p.remains >= MINIMO_FALTANDO)) return { repor: false, motivo: "não falta nada" };
  if (p.horasParado < ctx.horasTravadoMin) return { repor: false, motivo: "entrega ainda está andando" };
  if (p.remains > p.quantidade * TETO_FALTA_PCT) {
    return { repor: false, motivo: "falta demais — caso do dono, não de reposição" };
  }
  return { repor: true };
}

/** Quantas reposições ainda cabem hoje. */
export function saldoDoTeto(reposicoesHoje: number): number {
  return Math.max(0, TETO_REPOSICOES_DIA - reposicoesHoje);
}
