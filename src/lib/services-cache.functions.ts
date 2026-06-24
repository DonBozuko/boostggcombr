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
    const { SERVICOS_MONITORADOS, FALLBACK_SERVICES } = await import("@/lib/sync-services.server");

    // Garante fallback antes de medir (cache nunca fica vazio para IDs estáveis)
    const fallbackRows = FALLBACK_SERVICES.map((s) => ({
      ...s, refill: true, updated_at: new Date().toISOString(),
    }));
    await supabaseAdmin
      .from("services_cache")
      .upsert(fallbackRows, { onConflict: "provider_service_id", ignoreDuplicates: false });

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
