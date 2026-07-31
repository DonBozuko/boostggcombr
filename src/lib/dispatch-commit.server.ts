// v383 — Escrita atômica do fim de ciclo do pedido.
//
// Regra dura: o pedido só pode ganhar `provider_order_id` UMA vez. Todos os
// caminhos (webhook, reprocessamento, órfão) faziam o UPDATE condicional
// `.is("provider_order_id", null)` mas NÃO liam o resultado — se a corrida
// fosse perdida, o código seguia comemorando sucesso e podia contabilizar
// caixa/ledger de uma entrega que outro processo já registrou.
// Aqui a escrita devolve se a linha foi realmente reivindicada.

type Admin = { from: (t: string) => any };

export type CommitInput = {
  status: string;
  provider_slug: string;
  provider_order_id: string | null;
  error_detail?: string | null;
  custo_real?: number | null;
};

/**
 * Grava o desfecho do despacho. `false` = outro processo já gravou este pedido
 * (corrida perdida) → o chamador NÃO deve lançar ledger nem cobrar caixa.
 */
export async function commitDispatch(
  admin: Admin,
  pedidoId: string,
  input: CommitInput,
): Promise<boolean> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    status: input.status,
    provider_slug: input.provider_slug,
    provider_order_id: input.provider_order_id,
    dispatched_at: now,
    last_reconciled_at: now,
  };
  if (input.error_detail != null) patch.error_detail = input.error_detail;
  if (input.custo_real != null) patch.custo_real = Number(Number(input.custo_real).toFixed(4));

  const { data, error } = await admin
    .from("pedidos")
    .update(patch)
    .eq("id", pedidoId)
    .is("provider_order_id", null)
    .select("id");

  if (error) {
    console.error("[dispatch-commit] falha ao gravar desfecho", pedidoId, error);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}
