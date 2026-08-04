import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * v415 — Resolve alertas abertos do Jarvis.
 * Usado para limpar o "Alerta Vermelho" do Detector de Mentiras quando 
 * o problema já foi auditado ou é um teste de integridade conhecido.
 */
export const resolveJarvisAlerts = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; ids?: string[] }) => 
    z.object({ 
      token: z.string().min(8),
      ids: z.array(z.string()).optional()
    }).parse(input)
  )
  .handler(async ({ data }) => {
    const { isAdminToken } = await import("@/lib/admin-token.server");
    if (!isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // Filtro de tempo para evitar processamento massivo de alertas antigos
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    // Busca alertas não resolvidos recentes
    let q = supabaseAdmin
      .from("jarvis_alerts")
      .select("id, mensagem")
      .not("mensagem", "ilike", "✅ RESOLVIDO%")
      .gte("created_at", since);
      
    if (data.ids && data.ids.length > 0) {
      q = q.in("id", data.ids);
    }

    const { data: alerts, error: fetchError } = await q;
    if (fetchError) return { ok: false, error: fetchError.message };
    if (!alerts || alerts.length === 0) return { ok: true, resolved: 0 };

    let resolvedCount = 0;
    for (const alert of alerts) {
      const { error: updateError } = await supabaseAdmin
        .from("jarvis_alerts")
        .update({ mensagem: `✅ RESOLVIDO ${alert.mensagem}` })
        .eq("id", alert.id);
      if (!updateError) resolvedCount++;
    }

    return { ok: true, resolved: resolvedCount };
  });
