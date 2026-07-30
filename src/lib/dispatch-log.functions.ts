// v375 — Leitura da trilha forense de despacho para o painel admin.
// Só lê. Nunca recalcula, nunca reenvia. Resposta bruta do fornecedor
// exposta apenas para o diretor autenticado (token admin).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({
  token: z.string().min(8),
  onlyFail: z.boolean().optional(),
  provider: z.string().max(60).optional(),
  pedidoId: z.string().max(80).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

function authorized(token: string): boolean {
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

export type DispatchLogRow = {
  id: string;
  created_at: string;
  provider_slug: string;
  pacote: string | null;
  service_id: string | null;
  quantidade: number | null;
  target_link: string | null;
  http_status: number | null;
  raw_response: string | null;
  ok: boolean;
  order_id: string | null;
  error_text: string | null;
  attempt: number | null;
  pedido_id: string | null;
};

export const getDispatchLogs = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    if (!authorized(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let q = (supabaseAdmin as any)
      .from("dispatch_attempts_logs")
      .select(
        "id, created_at, provider_slug, pacote, service_id, quantidade, target_link, http_status, raw_response, ok, order_id, error_text, attempt, pedido_id",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 60);

    if (data.onlyFail) q = q.eq("ok", false);
    if (data.provider) q = q.eq("provider_slug", data.provider);
    if (data.pedidoId) q = q.eq("pedido_id", data.pedidoId);

    const { data: rows, error } = await q;
    if (error) return { ok: false as const, error: error.message };

    const list = ((rows as DispatchLogRow[]) ?? []);
    const falhas = list.filter((r) => !r.ok).length;
    return { ok: true as const, rows: list, total: list.length, falhas };
  });
