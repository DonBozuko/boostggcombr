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
    
    let query = supabaseAdmin
      .from("jarvis_alerts")
      .update({ mensagem: supabaseAdmin.rpc('resolve_alert_msg', { msg: 'mensagem' }) as any }) // Placeholder logic
      // Simplificando: vamos apenas prepend "✅ RESOLVIDO " na mensagem
      
    // Como RPC de update dinâmico é complexo via query builder sem rpc customizado,
    // vamos buscar os alertas e atualizar um por um ou via rpc se existir.
    
    const { data: alerts } = await supabaseAdmin
      .from("jarvis_alerts")
      .select("id, mensagem")
      .not("mensagem", "ilike", "✅ RESOLVIDO%")
      .in("id", data.ids ?? [])
      .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

    if (!alerts || alerts.length === 0) return { ok: true, resolved: 0 };

    let resolvedCount = 0;
    for (const alert of alerts) {
      const { error } = await supabaseAdmin
        .from("jarvis_alerts")
        .update({ mensagem: `✅ RESOLVIDO ${alert.mensagem}` })
        .eq("id", alert.id);
      if (!error) resolvedCount++;
    }

    return { ok: true, resolved: resolvedCount };
  });
