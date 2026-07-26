// v265 — Motor do Programa de Afiliados (server-only).
//
// Decisão comercial deliberada: comissão SÓ nasce depois do Pix aprovado, é
// registrada uma única vez por pedido (unique em pedido_id) e nunca sai
// automaticamente em dinheiro — o saque é aprovado no admin. Isso mata as duas
// fraudes clássicas de afiliado: auto-compra com estorno e saque antes do caixa.
import {
  AFFILIATE_DEFAULT_PCT,
  AFFILIATE_MIN_ORDER_BRL,
  AFFILIATE_MAX_PCT,
  affiliateCommission,
} from "@/lib/affiliate";

export { AFFILIATE_DEFAULT_PCT, AFFILIATE_MIN_ORDER_BRL, AFFILIATE_MAX_PCT, affiliateCommission };

export function generateAffiliateCode(nome: string): string {
  const base = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6) || "BOOST";
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
  return `${base}${rand}`.slice(0, 12);
}

/** Lê o código de indicação do cookie da requisição. */
export function refCodeFromHeaders(headers: Headers | undefined): string | null {
  const raw = headers?.get("cookie") ?? "";
  const m = raw.match(/(?:^|;\s*)ebp_ref=([^;]*)/);
  if (!m) return null;
  const c = decodeURIComponent(m[1]).trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return c.length >= 4 ? c : null;
}

/**
 * Credita a comissão de um pedido pago. Idempotente por pedido_id.
 * Nunca lança: falha aqui não pode derrubar o webhook do pagamento.
 */
export async function creditAffiliateForOrder(pedido: {
  id: string;
  valor: number | string;
  affiliate_code?: string | null;
  email_contato?: string | null;
}): Promise<{ credited: boolean; reason?: string }> {
  try {
    const code = (pedido.affiliate_code ?? "").trim().toUpperCase();
    if (!code) return { credited: false, reason: "SEM_INDICACAO" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("afiliados" as any)
      .select("id, email, comissao_pct, ativo")
      .eq("codigo", code)
      .maybeSingle();
    const af = data as any;
    if (!af || af.ativo !== true) return { credited: false, reason: "AFILIADO_INVALIDO" };

    // Anti auto-indicação: afiliado comprando com o próprio link não gera comissão.
    const buyer = (pedido.email_contato ?? "").trim().toLowerCase();
    if (buyer && buyer === String(af.email ?? "").toLowerCase()) {
      return { credited: false, reason: "AUTO_INDICACAO" };
    }

    const comissao = affiliateCommission(Number(pedido.valor), Number(af.comissao_pct ?? AFFILIATE_DEFAULT_PCT));
    if (comissao <= 0) return { credited: false, reason: "PEDIDO_ABAIXO_DO_MINIMO" };

    const { data: res, error } = await supabaseAdmin.rpc("afiliado_credit" as any, {
      _afiliado_id: af.id,
      _pedido_id: pedido.id,
      _valor_pedido: Number(pedido.valor),
      _comissao: comissao,
    });
    if (error) {
      console.error("[afiliados] rpc falhou:", error.message);
      return { credited: false, reason: "RPC_FALHOU" };
    }
    const row = Array.isArray(res) ? (res[0] as any) : (res as any);
    if (!row?.ok) return { credited: false, reason: row?.motivo ?? "NAO_CREDITADO" };
    return { credited: true };
  } catch (e) {
    console.error("[afiliados] erro inesperado:", (e as Error).message);
    return { credited: false, reason: "EXCECAO" };
  }
}
