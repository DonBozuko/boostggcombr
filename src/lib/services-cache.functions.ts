import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ token: z.string().min(8) });

function checkToken(token: string) {
  const expected = process.env.ADMIN_TOKEN;
  return !!expected && token === expected;
}

export const getServicesCacheStatus = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { SERVICOS_MONITORADOS } = await import("@/lib/sync-services.server");

    // v296 — Nada de "garantir" serviço no cache: o cache espelha só o que o
    // fornecedor devolve de verdade. Se um ID sumir, tem que aparecer aqui.
    const { data: rows, count } = await supabaseAdmin
      .from("services_cache")
      .select("provider_service_id, name, category, rate, updated_at", { count: "exact" });

    const ids = (rows ?? []).map((r: any) => r.provider_service_id as number);
    const missing = SERVICOS_MONITORADOS.filter((id) => !ids.includes(id));

    const lastSync = (rows ?? []).reduce<string | null>((acc, r: any) => {
      if (!acc || new Date(r.updated_at) > new Date(acc)) return r.updated_at;
      return acc;
    }, null);

    return {
      ok: true as const,
      total: count ?? rows?.length ?? 0,
      last_sync: lastSync,
      missing_monitored: missing,
      monitorados: SERVICOS_MONITORADOS,
    };
  });

export const sincronizarServicosAgora = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { syncSmmhypeServices } = await import("@/lib/sync-services.server");
    try {
      const res = await syncSmmhypeServices();
      return { ok: true as const, result: res };
    } catch (e: any) {
      return { ok: false as const, error: e?.message ?? String(e) };
    }
  });
