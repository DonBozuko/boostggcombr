import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Leitura pública e mínima de status do pedido (id é UUID, difícil de adivinhar).
export const getPedidoStatus = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pedidos")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) return { ok: false as const, status: null };
    return { ok: true as const, status: row.status as string };
  });

// === ADMIN: listar pedidos pagos e reprocessar ===
const adminInput = z.object({ token: z.string().min(8) });

function checkToken(token: string) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return token === expected;
}

export const listarPedidosPagos = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, created_at, status, pacote, quantidade, valor, instagram_user, mercado_pago_id, error_detail, rede_social")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, pedidos: rows ?? [] };
  });

// Lista pedidos com falha (SMM_FAILED, amount_mismatch, mp_rejected, etc) p/ auditoria.
export const listarPedidosFalhos = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, created_at, status, pacote, quantidade, instagram_user, mercado_pago_id, error_detail, rede_social")

      .or("status.eq.SMM_FAILED,status.eq.amount_mismatch,status.like.mp_%")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, pedidos: rows ?? [] };
  });

export const reprocessarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    adminInput.extend({ pedidoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pedido, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, pacote, quantidade, instagram_user")
      .eq("id", data.pedidoId)
      .maybeSingle();
    if (error || !pedido) return { ok: false as const, error: "NOT_FOUND" as const };
    if (pedido.status !== "paid" && pedido.status !== "SMM_FAILED")
      return { ok: false as const, error: `STATUS_${pedido.status}` as const };

    const { dispatchSmmhype } = await import("@/lib/smmhype.server");
    const smm = await dispatchSmmhype({
      pacote: pedido.pacote,
      quantidade: pedido.quantidade,
      instagram_user: pedido.instagram_user,
    });
    console.log("[reprocessar] resultado", { pedidoId: pedido.id, smm });
    if (!smm.ok) {
      const detail = `${smm.error}${smm.status ? ` (HTTP ${smm.status})` : ""}`.slice(0, 500);
      await supabaseAdmin
        .from("pedidos")
        .update({ status: "SMM_FAILED", error_detail: detail })
        .eq("id", pedido.id);
      return { ok: false as const, error: "SMM_FAILED" as const, detail: smm.error };
    }
    await supabaseAdmin
      .from("pedidos")
      .update({ status: "paid", error_detail: null })
      .eq("id", pedido.id);
    return { ok: true as const, orderId: smm.orderId ?? null };
  });

// Lista pedidos pendentes (Pix gerado, ainda não pago) com flag de notificação de abandono.
export const listarPedidosPendentes = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, created_at, status, pacote, quantidade, instagram_user, mercado_pago_id, abandono_notificado_at, rede_social")

      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, pedidos: rows ?? [] };
  });
