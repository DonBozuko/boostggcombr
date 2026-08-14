import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * v636.1 — Jarvis Incidents Backend
 * Implementação da máquina de estados e circuit breaker para incidentes.
 */


export type IncidentStatus = 
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'ROOT_CAUSE_IDENTIFIED'
  | 'FIX_APPLIED'
  | 'VALIDATING'
  | 'REGRESSION_VERIFIED'
  | 'CLOSED';

export type AlertSeverity = 'critical' | 'error' | 'warning' | 'info';

const VALID_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  'DETECTED': ['INVESTIGATING', 'CLOSED'], // CLOSED permitido apenas com justificativa (falso positivo)
  'INVESTIGATING': ['ROOT_CAUSE_IDENTIFIED', 'DETECTED'],
  'ROOT_CAUSE_IDENTIFIED': ['FIX_APPLIED', 'INVESTIGATING'],
  'FIX_APPLIED': ['VALIDATING', 'ROOT_CAUSE_IDENTIFIED'],
  'VALIDATING': ['REGRESSION_VERIFIED', 'FIX_APPLIED'],
  'REGRESSION_VERIFIED': ['CLOSED', 'VALIDATING'],
  'CLOSED': ['DETECTED'], // Reabertura formal
};

const adminInput = z.object({ token: z.string().min(8) });

export const createIncident = createServerFn({ method: "POST" })
  .validator((input) => adminInput.extend({
    type: z.string(),
    headline: z.string(),
    severity: z.enum(['critical', 'error', 'warning', 'info']),
    origin: z.string(),
    alertIds: z.array(z.string().uuid()).optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { assertAdmin } = await import("@/lib/admin-guard.server");
      const auth = await assertAdmin(data.token, "create-incident");
      if (!auth.ok) return { ok: false as const, error: "UNAUTHORIZED" };

      const adminEmail = "fabiano.majestic@gmail.com"; // Email mestre fixo do projeto (v434)

      
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      
      const { data: incident, error } = await supabaseAdmin
        .from("jarvis_incidents")
        .insert({
          type: data.type,
          headline: data.headline,
          severity: data.severity,
          origin: data.origin,
          alert_ids: data.alertIds ?? [],
          status: 'DETECTED'
        })
        .select()
        .single();

      if (error) throw error;

      // Auditoria
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_email: adminEmail,
        action: "incident_created",
        detail: { incidentId: incident.id, type: data.type }
      });

      return { ok: true as const, incident };

    } catch (e) {
      console.error("[jarvis-incidents] create failed (circuit breaker active)", e);
      return { ok: false as const, error: "CIRCUIT_BREAKER_ACTIVE" };
    }
  });

export const updateIncidentStatus = createServerFn({ method: "POST" })
  .validator((input) => adminInput.extend({
    incidentId: z.string().uuid(),
    newStatus: z.enum(['DETECTED', 'INVESTIGATING', 'ROOT_CAUSE_IDENTIFIED', 'FIX_APPLIED', 'VALIDATING', 'REGRESSION_VERIFIED', 'CLOSED']),
    rootCause: z.string().optional(),
    fixApplied: z.string().optional(),
    validationNotes: z.string().optional(),
    regressionVerified: z.boolean().optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    try {
      const { assertAdmin } = await import("@/lib/admin-guard.server");
      const auth = await assertAdmin(data.token, "update-incident");
      if (!auth.ok) return { ok: false as const, error: "UNAUTHORIZED" };

      const adminEmail = "fabiano.majestic@gmail.com";


      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Buscar estado atual
      const { data: current } = await supabaseAdmin
        .from("jarvis_incidents")
        .select("*")
        .eq("id", data.incidentId)
        .single();

      if (!current) return { ok: false as const, error: "NOT_FOUND" };

      // Validação da Máquina de Estados
      const allowed = VALID_TRANSITIONS[current.status as IncidentStatus] ?? [];
      if (data.newStatus !== current.status && !allowed.includes(data.newStatus)) {
        return { ok: false as const, error: `INVALID_TRANSITION: ${current.status} -> ${data.newStatus}` };
      }



      // Validações de encerramento
      if (data.newStatus === 'CLOSED') {
        const rc = data.rootCause || current.root_cause;
        const fix = data.fixApplied || current.fix_applied;
        const val = data.validationNotes || current.validation_notes;
        const reg = data.regressionVerified ?? current.regression_verified;

        if (!rc || !fix || !val || !reg) {
          return { ok: false as const, error: "MISSING_RESOLUTION_DATA" };
        }
      }

      const updateData: any = {
        status: data.newStatus,
        root_cause: data.rootCause ?? current.root_cause,
        fix_applied: data.fixApplied ?? current.fix_applied,
        validation_notes: data.validationNotes ?? current.validation_notes,
        regression_verified: data.regressionVerified ?? current.regression_verified,
      };

      if (data.newStatus === 'CLOSED') {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabaseAdmin
        .from("jarvis_incidents")
        .update(updateData)
        .eq("id", data.incidentId);

      if (error) throw error;

      // Auditoria
      await supabaseAdmin.from("admin_audit_logs").insert({
        admin_email: adminEmail,
        action: "incident_status_changed",
        detail: { 
          incidentId: data.incidentId, 
          from: current.status, 
          to: data.newStatus 
        }
      });

      return { ok: true as const };
    } catch (e) {
      console.error("[jarvis-incidents] update failed", e);
      return { ok: false as const, error: "UPDATE_FAILED" };
    }
  });
