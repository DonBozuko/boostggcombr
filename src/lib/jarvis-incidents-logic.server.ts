import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * v637 — Integração Jarvis Incidents
 * Lógica de triagem e semáforo incorporando incidentes.
 */

export const getIncidentTriage = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { assertAdmin } = await import("@/lib/admin-guard.server");
      if (!(await assertAdmin(data.token, "jarvis-incidents-triage")).ok) {
        return { ok: false as const, error: "UNAUTHORIZED" };
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      
      const { data: openIncidents, error } = await supabaseAdmin
        .from("jarvis_incidents")
        .select("*")
        .not("status", "eq", "CLOSED")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const incs = (openIncidents ?? []) as any[];
      const critical = incs.filter(i => i.severity === 'critical').length;
      const investigating = incs.filter(i => i.status === 'INVESTIGATING').length;
      const validating = incs.filter(i => i.status === 'VALIDATING').length;

      return {
        ok: true as const,
        counters: {
          totalOpen: incs.length,
          critical,
          investigating,
          validating
        },
        incidents: incs
      };
    } catch (e) {
      console.error("[jarvis-incidents] triage failed", e);
      return { ok: false as const, error: "FETCH_FAILED" };
    }
  });

// v636.1: Flag de recursão para evitar loops infinitos em caso de erro na gravação de incidentes
let isRecordingIncident = false;

export async function detectIncidentFromAlert(alert: { id: string; type: string; severity: string; origin: string; headline: string }) {
  if (isRecordingIncident) {
    console.error("[jarvis-detector] recursive incident detection blocked", alert.headline);
    return { ok: false, error: "RECURSION_BLOCKED" };
  }

  isRecordingIncident = true;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    
    // v637: Deduplicação fluente utilizando a chave composta (origem + tipo) nas últimas 4h
    const { data: existing, error: findError } = await supabaseAdmin
      .from("jarvis_incidents")
      .select("id, occurrence_count")
      .eq("origin", alert.origin)
      .eq("type", alert.type)
      .not("status", "eq", "CLOSED")
      .gte("created_at", fourHoursAgo)
      .limit(1);

    if (findError) throw findError;

    if (existing && existing.length > 0) {
      // Incrementar contador de ocorrências em vez de duplicar a linha
      await supabaseAdmin
        .from("jarvis_incidents")
        .update({ 
          occurrence_count: (existing[0].occurrence_count || 1) + 1,
          last_seen_at: new Date().toISOString()
        })
        .eq("id", existing[0].id);

      return { ok: true, duplicated: true, incidentId: existing[0].id };
    }

    // Gerar dedup_key atômica
    const dedup_key = `${alert.origin}:${alert.type}:${new Date().toISOString().split('T')[0]}`;

    // v637: Inserção fluente
    const { data: incident, error: insertError } = await supabaseAdmin
      .from("jarvis_incidents")
      .insert({
        type: alert.type,
        headline: alert.headline,
        severity: alert.severity as any,
        origin: alert.origin,
        alert_ids: [alert.id],
        status: 'DETECTED',
        dedup_key
      })
      .select()
      .single();

    if (insertError) throw insertError;

    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_email: "system@jarvis.detector",
      action: "incident_auto_created",
      detail: { incidentId: incident.id, alertId: alert.id, type: alert.type }
    });

    return { ok: true, incidentId: incident.id };
  } catch (e) {
    console.error("[jarvis-detector] incident auto-creation failed", e);
    return { ok: false, error: "AUTO_CREATE_FAILED" };
  } finally {
    isRecordingIncident = false;
  }
}
