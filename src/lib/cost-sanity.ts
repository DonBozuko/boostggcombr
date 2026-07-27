// v294 — TRAVA DE SANIDADE DE CUSTO NO ROTEAMENTO
//
// Por que existe: um ID auto-resolvido pode apontar para o serviço ERRADO do
// fornecedor (mesma rede, produto diferente). O teste seco passa (o ID existe),
// mas o pedido real volta "canceled" — foi o que aconteceu com yv1k
// (YouTube Views 1k, custo real ~R$ 4,41) roteado para um serviço de R$ 0,20.
//
// Regra: se o custo calculado do fornecedor destoa absurdamente do custo de
// referência do pacote, o ID quase certamente é de outro produto. Descarta.
// Só se aplica a IDs AUTO-resolvidos — ID curado à mão é verdade absoluta.

/** Fora dessa faixa, o ID auto é considerado de outro produto. */
export const COST_SANITY_MIN_RATIO = 0.25;
export const COST_SANITY_MAX_RATIO = 4;

export function costIsSane(candidate: number | null | undefined, reference: number | null | undefined): boolean {
  const c = Number(candidate);
  const r = Number(reference);
  // Sem dado confiável dos dois lados → não bloqueia venda (regra: nunca parar
  // o dispatch por falta de informação; outras travas cuidam disso).
  if (!Number.isFinite(c) || c <= 0) return true;
  if (!Number.isFinite(r) || r <= 0) return true;
  const ratio = c / r;
  return ratio >= COST_SANITY_MIN_RATIO && ratio <= COST_SANITY_MAX_RATIO;
}
