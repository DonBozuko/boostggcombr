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
    
    // v416: Aumentado para 6h para garantir que alertas persistentes sejam capturados
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    // Busca alertas não resolvidos recentes
    let q = supabaseAdmin
      .from("jarvis_alerts")
      .select("id, mensagem, severidade, origem")
      .not("mensagem", "ilike", "✅ RESOLVIDO%")
      .gte("created_at", since);
      
    if (data.ids && data.ids.length > 0) {
      q = q.in("id", data.ids);
    }

    const { data: alerts, error: fetchError } = await q;
    if (fetchError) return { ok: false, error: fetchError.message };
    if (!alerts || alerts.length === 0) return { ok: true, resolved: 0 };

    let resolvedCount = 0;
    
    // Processamento individual para garantir o prefixo de mensagem e evitar erros de RPC
    for (const alert of alerts) {
      // v416: Auditoria Forense — prefixamos com RESOLVIDO e registramos metadados do evento
      const { error: updateError } = await supabaseAdmin
        .from("jarvis_alerts")
        .update({ 
          mensagem: `✅ RESOLVIDO ${alert.mensagem}`,
          detalhe: `Resolução manual via Console TI em ${new Date().toISOString()}`
        })
        .eq("id", alert.id);
        
      if (!updateError) {
        resolvedCount++;
        // Log de auditoria para cada resolução
        await supabaseAdmin.from("admin_audit_logs").insert({
          action: "jarvis_alert_resolved",
          target_id: alert.id,
          detail: `Alerta [${alert.origem}] resolvido manualmente.`,
        });
      }
    }

    return { ok: true, resolved: resolvedCount };
  });
