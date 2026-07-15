import { createServerFn } from "@tanstack/react-start";

/**
 * getBestsellers — leitura pública dos pacotes mais vendidos em 24h.
 * Retorna { bestsellers: { [pacoteId]: true }, generated_at, sample }.
 * Alimentado pelo cron bestseller-scan (30min).
 */
export const getBestsellers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "bestsellers_24h")
      .maybeSingle();
    if (error || !data) return { bestsellers: {} as Record<string, true>, generated_at: null, sample: 0 };
    const v = (data.value ?? {}) as { bestsellers?: Record<string, true>; generated_at?: string; sample?: number };
    return {
      bestsellers: v.bestsellers ?? {},
      generated_at: v.generated_at ?? null,
      sample: v.sample ?? 0,
    };
  } catch {
    return { bestsellers: {} as Record<string, true>, generated_at: null, sample: 0 };
  }
});
