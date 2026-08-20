import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { 
  classifyProbe, 
  aggregateStates, 
  HealthState, 
  MetricProbe 
} from "./jarvis-truth";

const adminInput = z.object({ token: z.string().min(8) });

const TABLES = [
  "pedidos", "fornecedores", "monitoramento_saldo", "service_id_overrides",
  "services_cache", "admin_settings", "admin_audit_logs", "alerts",
  "bank_accounts", "jarvis_alerts", "scheduled_posts", "suppliers",
  "connection_tests", "pedidos_legacy", "jarvis_incidents"
];

export type MetricResult = {
  state: HealthState;
  value: any;
  reason: string;
  source: string;
  timestamp: string | null;
};

/**
 * v653 — Jarvis Truth Protocol
 * Contrato oficial de telemetria.
 */
export type JarvisChatResp =
  | { ok: true; answer: string; data?: any; requiresConfirmation?: false }
  | { ok: true; requiresConfirmation: true; reason: string; question: string }
  | { ok: false; error: string };

export type NocSnapshot = {
  ok: true;
  globalStatus: HealthState;
  metrics: Record<string, MetricResult>;
  systemHealth: { total: number; ok: number; tables: Array<{ name: string; ok: boolean; ms: number }> };
  fornecedores: Array<{ 
    id: string; 
    nome: string; 
    state: HealthState; 
    saldo: number | null; 
    saldoUsd: number | null; 
    cotacao?: number;
    ativo: boolean; 
    ultima: string | null;
    falhas?: number;
    status?: string;
  }>;
  pedidos: { total24h: number; pagos24h: number; pendentes24h: number; travados: number };
  incidents: { totalOpen: number; critical: number };
  apiLatency: Array<{ name: string; ms: number; ok: boolean }>;
  guardas: any[];
  guardasMarginHold24h: number;
  confiabilidade: any[];
  generatedAt: string;
} | { ok: false; error: string };

export const jarvisNocSnapshot = createServerFn({ method: "POST" })
  .validator((input) => adminInput.parse(input))
  .handler(async ({ data }): Promise<NocSnapshot> => {
    try {
      const { assertAdmin } = await import("@/lib/admin-guard.server");
      if (!(await assertAdmin(data.token, "jarvis-noc")).ok) return { ok: false, error: "UNAUTHORIZED" };
      
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const now = new Date().toISOString();
      const metrics: Record<string, MetricResult> = {};

      // 1. Probe Banco de Dados
      const dbProbeResults = await Promise.all(TABLES.map(async (name) => {
        const t0 = Date.now();
        const { error } = await supabaseAdmin.from(name as any).select("id", { count: "exact", head: true }).limit(1);
        return { name, ok: !error, ms: Date.now() - t0 };
      }));
      
      const dbError = dbProbeResults.find(r => !r.ok);
      metrics["database"] = {
        state: dbError ? "RED" : "GREEN",
        value: dbProbeResults.length,
        reason: dbError ? `Falha em ${dbError.name}` : "Tabelas acessíveis",
        source: "supabase.db",
        timestamp: now
      };

      // 2. Probes de APIs Externas
      const apiLatency: Array<{ name: string; ms: number; ok: boolean }> = [];
      const probeLatency = async (name: string, url: string, source: string): Promise<MetricResult> => {
        const t0 = Date.now();
        try {
          const r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(3000) });
          const ms = Date.now() - t0;
          const ok = r.status < 500 && ms < 3000;
          apiLatency.push({ name, ms, ok });
          return {
            state: ok ? "GREEN" : (ms >= 3000 ? "DEGRADED" : "RED"),
            value: { ms, status: r.status },
            reason: ok ? "Resposta rápida" : (ms >= 3000 ? "Timeout/Latência" : `HTTP ${r.status}`),
            source,
            timestamp: now
          };
        } catch (e: any) {
          apiLatency.push({ name, ms: Date.now() - t0, ok: false });
          return {
            state: "UNKNOWN",
            value: null,
            reason: `Falha telemetria: ${e?.message || 'Timeout'}`,
            source,
            timestamp: now
          };
        }
      };

      metrics["mp"] = await probeLatency("MercadoPago", "https://api.mercadopago.com/", "ping.mp");
      metrics["smm"] = await probeLatency("SMMhype", "https://smmhype.com/", "ping.smm");

      // 3. Fornecedores
      const { data: fornecedoresRows } = await supabaseAdmin
        .from("fornecedores").select("id, nome, status, saldo_atual, cotacao_brl, ativo, falhas_consecutivas, ultima_verificacao, limite_alerta");
      
      const forns = (fornecedoresRows ?? []).map((f: any) => {
        const probe: MetricProbe = {
          value: f.saldo_atual,
          timestamp: f.ultima_verificacao,
          valid: f.status === "Online",
          source: `supplier.${f.nome}`
        };
        const classification = classifyProbe(probe, (val) => {
          const saldo = Number(val || 0);
          const limit = Number(f.limite_alerta || 100);
          if (saldo <= 0) return { state: "RED", reason: "Sem saldo" };
          if (saldo < limit) return { state: "DEGRADED", reason: "Saldo baixo" };
          return { state: "GREEN", reason: "Saldo OK" };
        });
        return {
          id: f.id, nome: f.nome, state: classification.state,
          saldo: f.saldo_atual ? Number(f.saldo_atual) : null,
          saldoUsd: f.saldo_atual ? Number((Number(f.saldo_atual) / (f.cotacao_brl || 5)).toFixed(2)) : null,
          cotacao: f.cotacao_brl, ativo: !!f.ativo, ultima: f.ultima_verificacao,
          falhas: f.falhas_consecutivas, status: f.status
        };
      });
      
      // 4. Pedidos
      const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
      const cutoffStuck = new Date(Date.now() - 15 * 60_000).toISOString();
      const [{ data: p24 }, { count: stuckCount }] = await Promise.all([
        supabaseAdmin.from("pedidos").select("status").gte("created_at", since24h),
        supabaseAdmin.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "paid").is("provider_order_id", null).lt("created_at", cutoffStuck)
      ]);
      const total24h = p24?.length ?? 0;
      const pagos24h = (p24 ?? []).filter((p: any) => ["paid", "processing", "completed"].includes(p.status)).length;

      // 5. Incidentes
      const { data: openIncidents } = await supabaseAdmin.from("jarvis_incidents").select("id, severity").not("status", "eq", "CLOSED");
      const incCount = openIncidents?.length ?? 0;
      const criticalInc = (openIncidents ?? []).filter((i: any) => i.severity === 'critical').length;

      // 6. Guardas
      const { summarizeGuards } = await import("@/lib/guards-summary");
      const { data: guardRows } = await supabaseAdmin.from("admin_audit_logs").select("action, created_at").gte("created_at", since24h).limit(2000);
      const guardas = summarizeGuards((guardRows ?? []) as any[]);

      return {
        ok: true,
        globalStatus: aggregateStates(Object.values(metrics).map(m => m.state).concat(criticalInc > 0 ? ["RED"] : [])),
        metrics,
        systemHealth: { total: dbProbeResults.length, ok: dbProbeResults.filter(t => t.ok).length, tables: dbProbeResults },
        fornecedores: forns,
        pedidos: { total24h, pagos24h, pendentes24h: total24h - pagos24h, travados: stuckCount ?? 0 },
        incidents: { totalOpen: incCount, critical: criticalInc },
        apiLatency,
        guardas,
        guardasMarginHold24h: 0,
        confiabilidade: [],
        generatedAt: now
      };
    } catch (e: any) {
      return { ok: false, error: e?.message || "Erro telemetria" };
    }
  });

export const jarvisChat = createServerFn({ method: "POST" })
  .validator((input) => z.object({ token: z.string().min(8), question: z.string().min(2).max(500) }).parse(input))
  .handler(async ({ data }): Promise<JarvisChatResp> => {
     const { assertAdmin } = await import("@/lib/admin-guard.server");
     if (!(await assertAdmin(data.token, "jarvis-chat")).ok) return { ok: false, error: "UNAUTHORIZED" };
     return { ok: true, answer: "J.A.R.V.I.S. operando sob Protocolo de Verdade v653. Como posso ajudar, Diretor?" };
  });

export const jarvisFailoverAtivo = createServerFn({ method: "POST" })
  .validator((input) => adminInput.parse(input))
  .handler(async ({ data }) => ({ ok: true as const, action: "noop" as const, reason: "Truth v653 active" }));
