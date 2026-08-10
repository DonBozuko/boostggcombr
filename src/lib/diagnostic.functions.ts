
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const diagnosticPrices = createServerFn({ method: "POST" })
  .validator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    const pacotes = ['br-p100', 'br-p10k', 'br-p2k', 'br-p5k', 'p200k', 'br-tf100', 'br-tf500', 'br-tf1000'];
    
    const [pricing, vetos, config] = await Promise.all([
      supabaseAdmin.from("pricing_items").select("pacote, price_brl, cost_brl, quantidade, is_sellable, sellable_reason, category").in("pacote", pacotes),
      supabaseAdmin.from("shelf_vetoes").select("pacote, source, motivo, expires_at").in("pacote", pacotes),
      supabaseAdmin.from("app_config").select("key, value").eq("key", "AUTHORITY_MAX_UP").maybeSingle()
    ]);

    return {
      ok: true,
      pricing: pricing.data,
      vetos: vetos.data,
      config: config.data
    };
  });
