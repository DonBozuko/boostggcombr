import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * AUTO-AUDITORIA v507 (RITMO INDUSTRIAL v408)
 * Objetivo: Auditoria de baixo custo focada em fluxos críticos sem queimar créditos.
 */
export const runAutoAudit = createServerFn({ method: "POST" })
  .inputValidator((i: { token: string }) => z.object({ token: z.string().min(8) }).parse(i))
  .handler(async ({ data }) => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      throw new Error("UNAUTHORIZED");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results: any = {
      timestamp: new Date().toISOString(),
      fluxo_vitrine: {},
      seo: {},
      financeiro: {},
      sinal_verde: true
    };

    try {
      // 1. Auditoria de Fluxo de Pacotes (Ativos vs Não Ativos)
      const { data: pricing } = await supabaseAdmin
        .from("pricing_items")
        .select("is_sellable, count", { count: "exact" });
      
      const { data: sellableCount } = await supabaseAdmin
        .from("pricing_items")
        .select("*", { count: "exact", head: true })
        .eq("is_sellable", true);

      const { data: unsellableCount } = await supabaseAdmin
        .from("pricing_items")
        .select("*", { count: "exact", head: true })
        .eq("is_sellable", false);

      // Busca vetos ativos para entender o PORQUÊ do não-ativo
      const { data: vetos } = await supabaseAdmin
        .from("shelf_vetos" as any)
        .select("source, motivo, pacote")
        .gte("expires_at", new Date().toISOString());

      results.fluxo_vitrine = {
        total: (sellableCount ?? 0) + (unsellableCount ?? 0),
        ativos: sellableCount ?? 0,
        pausados: unsellableCount ?? 0,
        principais_motivos: (vetos ?? []).slice(0, 5)
      };

      // 2. SEO & Posição (Checagem de Metadados Críticos)
      const { data: seoSettings } = await supabaseAdmin
        .from("admin_settings")
        .select("value")
        .eq("key", "seo_config")
        .maybeSingle();
      
      results.seo = {
        config_presente: !!seoSettings,
        indexacao_bloqueada: JSON.stringify(seoSettings?.value).includes("noindex")
      };

      // 3. Financeiro (Vendas hoje)
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const { count: vendasHoje } = await supabaseAdmin
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("created_at", startOfDay.toISOString());
      
      results.financeiro = {
        vendas_hoje: vendasHoje ?? 0
      };

      return { ok: true, results };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  });
