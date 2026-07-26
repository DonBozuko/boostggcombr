// v278 — Trava de envio (anti dupla-entrega real).
//
// Causa raiz do defeito: todos os caminhos de envio (webhook do MP,
// reconciliador de órfãos, reprocessamento da fila) chamavam o fornecedor
// PRIMEIRO e só depois faziam o UPDATE condicional
// (`.is("provider_order_id", null)`). Isso protege o banco, não o dinheiro:
// se dois processos rodam ao mesmo tempo, os DOIS já mandaram o pedido pro
// fornecedor e só um consegue gravar. Resultado: saldo gasto em dobro e
// cliente recebendo duas vezes, sem rastro no pedido.
//
// A correção é reivindicar ANTES do efeito externo. O UPDATE condicional
// trava a linha no Postgres: só um processo sai vencedor.
//
// Reivindicação expira em 3 min para que a queda de um worker no meio do
// envio não deixe o pedido preso para sempre.

const CLAIM_TTL_MS = 3 * 60_000;

type Admin = { from: (t: string) => any };

/** Tenta reservar o envio do pedido. `false` = outro processo já está enviando. */
export async function claimDispatch(admin: Admin, pedidoId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - CLAIM_TTL_MS).toISOString();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("pedidos")
    .update({ dispatch_claimed_at: now })
    .eq("id", pedidoId)
    .is("provider_order_id", null)
    .or(`dispatch_claimed_at.is.null,dispatch_claimed_at.lt.${staleBefore}`)
    .select("id");
  if (error) {
    // Fail-closed: sem certeza da trava, não envia. Um pedido atrasado é
    // recuperável pelo reconciliador; uma entrega dupla não volta.
    console.error("[dispatch-claim] falha ao reivindicar", pedidoId, error);
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

/** Devolve a reserva quando o envio não aconteceu. */
export async function releaseDispatch(admin: Admin, pedidoId: string): Promise<void> {
  try {
    await admin
      .from("pedidos")
      .update({ dispatch_claimed_at: null })
      .eq("id", pedidoId)
      .is("provider_order_id", null);
  } catch (e) {
    console.warn("[dispatch-claim] falha ao liberar", pedidoId, e);
  }
}
