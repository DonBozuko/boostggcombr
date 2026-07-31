// v383 — Portão único de elegibilidade de fornecedor.
//
// As mesmas três checagens (saldo zero, saldo < custo, margem mínima) estavam
// copiadas em três lugares (webhook do MP, reprocessamento e redispatch de
// órfão), com textos e ordens diferentes. Divergência entre cópias já causou
// pedido despachado num caminho e barrado no outro. Agora existe UM portão.

export type ProviderCandidate = {
  slug: string;
  nome?: string | null;
  saldo_atual?: number | string | null;
  cost_brl?: number | null;
  unstable?: boolean | null;
};

export type GateVerdict =
  | { allow: true }
  | { allow: false; kind: "unstable" | "saldo_zero" | "saldo_insuficiente" | "margem"; reason: string };

/**
 * Decide se um fornecedor pode receber este pedido.
 * `marginCheck` permite piso de lucro diferente (revenda) sem duplicar regra.
 */
export function evaluateProviderGate(
  f: ProviderCandidate,
  valorVenda: number,
  marginCheck: (valor: number, cost: number) => boolean,
  opts?: { skipUnstable?: boolean },
): GateVerdict {
  const nome = f.nome ?? f.slug;
  if (opts?.skipUnstable && f.unstable) {
    return { allow: false, kind: "unstable", reason: `${nome}: instável` };
  }
  const saldo = Number(f.saldo_atual ?? 0);
  if (!(saldo > 0)) {
    return { allow: false, kind: "saldo_zero", reason: `${nome}: saldo zerado/indisponível: R$ ${saldo.toFixed(2)}` };
  }
  const custo = f.cost_brl;
  if (custo != null && saldo < custo) {
    return {
      allow: false,
      kind: "saldo_insuficiente",
      reason: `${nome}: saldo insuficiente: R$ ${saldo.toFixed(2)} < custo R$ ${Number(custo).toFixed(2)}`,
    };
  }
  if (custo != null && !marginCheck(Number(valorVenda), Number(custo))) {
    return {
      allow: false,
      kind: "margem",
      reason: `${nome}: margem abaixo do piso: venda R$ ${Number(valorVenda).toFixed(2)} vs custo R$ ${Number(custo).toFixed(2)}`,
    };
  }
  return { allow: true };
}
