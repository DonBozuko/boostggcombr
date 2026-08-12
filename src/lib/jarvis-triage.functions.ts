import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * v223 — Jarvis Triage Digest
 * Substitui a enxurrada de alertas no Telegram por UM semáforo consolidado.
 * O que faz:
 *   1. Lê jarvis_alerts das últimas 24h + pedidos travados + saldo baixo.
 *   2. Auto-classifica em verde / amarelo / vermelho.
 *   3. Devolve headline curta e ações sugeridas (com link/rota).
 * Só o vermelho merece atenção imediata; amarelo pode esperar; verde ignora.
 */

export type TriageAction = {
  id: string;
  label: string;
  href?: string;
  urgency: "high" | "medium" | "low";
};

export type TriageDigest = {
  status: "green" | "yellow" | "red";
  headline: string;
  summary: string;
  actions: TriageAction[];
  counters: {
    criticalAlerts: number;
    warningAlerts: number;
    stuckOrders: number;
    lowBalanceProviders: number;
    pendingRecovery: number;
    databaseErrors: number;
    invalidTargetAnomalies: number;
  };
  generatedAt: string;
};

export const getJarvisTriage = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }): Promise<TriageDigest> => {
    // v425 — Triage agora usa autenticação Supabase nativa se o token ADMIN_TOKEN não for suficiente.
    if (!(await (await import("@/lib/admin-guard.server")).assertAdmin(data.token, "jarvis-triage")).ok) {
      return {
        status: "red",
        headline: "Sessão Administrativa Expirada",
        summary: "O acesso às ferramentas de triagem do J.A.R.V.I.S. requer autenticação válida do administrador.",
        actions: [
          { id: "re-auth", label: "Fazer Login Novamente", href: "/auth?next=/admin", urgency: "high" }
        ],
        counters: { criticalAlerts: 0, warningAlerts: 0, stuckOrders: 0, lowBalanceProviders: 0, pendingRecovery: 0, databaseErrors: 0, invalidTargetAnomalies: 0 },
        generatedAt: new Date().toISOString(),
      };
    }
    const now = Date.now();
    const counters = {
      criticalAlerts: 0,
      warningAlerts: 0,
      stuckOrders: 0,
      lowBalanceProviders: 0,
      pendingRecovery: 0,
      databaseErrors: 0,
      invalidTargetAnomalies: 0,
    };
    const actions: TriageAction[] = [];
    let status: TriageDigest["status"] = "green";
    let headline = "Tudo em ordem, pode relaxar";
    let summary = "Nenhuma ação urgente. Sistema operando normal.";

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const since6h = new Date(now - 6 * 60 * 60 * 1000).toISOString();
      // v342 — alerta vencido não mantém vermelho.
      // Só o alerta MAIS RECENTE de cada origem conta, e só nos últimos 20 min.
      // Se o ops-audit rodou de novo e deu OK, o vermelho de 1h atrás morre.
      const since20m = now - 20 * 60 * 1000;

      // 1. Alertas abertos últimas 6h
      const { data: alertas } = await supabaseAdmin
        .from("jarvis_alerts")
        .select("severidade, mensagem, origem, created_at")
        .gte("created_at", since6h)
        .order("created_at", { ascending: false });

      const vistos = new Map<string, number>(); // origem -> severidade (0=info, 1=warn, 2=crit)
      const SEV_MAP: Record<string, number> = { info: 0, warning: 1, critical: 2, error: 2 };

      for (const a of (alertas ?? []) as unknown as Array<{ severidade?: string; origem?: string; created_at?: string }>) {
        const s = String(a.severidade ?? "").toLowerCase();
        const orig = String(a.origem ?? "system");
        const at = new Date(String(a.created_at ?? 0)).getTime();
        
        // v628: Proteção contra silenciamento — Alertas críticos de checkout/pagamento não podem ser suprimidos
        const isCriticalCheckout = (orig === "checkout" || orig === "payment") && (s === "critical" || s === "error");
        
        if (vistos.has(orig) && !isCriticalCheckout) continue;
        if (!vistos.has(orig)) vistos.set(orig, SEV_MAP[s] ?? 1);
        
        if (at < since20m) continue;
        if (s === "critical" || s === "error") counters.criticalAlerts++;
        else if (s === "warning") counters.warningAlerts++;
      }

      // v628 — Saúde do Funil e Detecção de Anomalias
      // Busca eventos de falha no funil nos últimos 15 min
      const since15m = new Date(now - 15 * 60 * 1000).toISOString();
      const { data: funnelFailures } = await supabaseAdmin
        .from("funnel_events")
        .select("detail, step")
        .eq("step", "pix_falhou")
        .gte("created_at", since15m);
      
      const failures = (funnelFailures ?? []) as unknown as Array<{ detail: string }>;
      counters.databaseErrors = failures.filter(f => f.detail?.includes("DATABASE_ERROR")).length;
      
      const targetFailures = failures.filter(f => f.detail?.includes("PROFILE_NOT_FOUND") || f.detail?.includes("INVALID_TARGET")).length;
      // Gatilho: >3 falhas de alvo em 15min vira anomalia amarela
      if (targetFailures > 3) {
        counters.invalidTargetAnomalies = targetFailures;
      }


      // 2. Pedidos pagos travados >15min
      const cutoffPaid = new Date(now - 15 * 60 * 1000).toISOString();
      const { count: stuck } = await supabaseAdmin
        .from("pedidos")
        .select("*", { count: "exact", head: true })
        .eq("status", "paid")
        .is("provider_order_id", null)
        .lt("created_at", cutoffPaid);
      counters.stuckOrders = stuck ?? 0;

      // 3. Fila de recuperação Pix. Defesa em profundidade: a fila sozinha não
      // prova abandono; o pedido ainda precisa estar pendente e dentro de 24h.
      const recoveryCutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const { data: recoveryRows } = await supabaseAdmin
        .from("pix_recovery_queue")
        .select("pedido_id")
        .in("status", ["novo", "contatado"])
        .gte("first_seen_at", recoveryCutoff)
        .limit(500);
      const recoveryIds = (recoveryRows ?? []).map((row) => row.pedido_id);
      if (recoveryIds.length > 0) {
        const { count: actionable } = await supabaseAdmin
          .from("pedidos")
          .select("id", { count: "exact", head: true })
          .in("id", recoveryIds)
          .in("status", ["pending", "mp_pending", "mp_in_process"]);
        counters.pendingRecovery = actionable ?? 0;
      }

      // 4. Saldos baixos — colunas reais são saldo_atual + limite_alerta
      try {
        const { data: fh } = await supabaseAdmin
          .from("fornecedores")
          .select("nome, saldo_atual, limite_alerta, ativo")
          .eq("ativo", true);
        for (const f of (fh ?? []) as unknown as Array<{ saldo_atual: number | null; limite_alerta: number | null }>) {
          const bal = Number(f.saldo_atual ?? 0);
          const thr = Number(f.limite_alerta ?? 30);
          if (bal > 0 && bal < thr) counters.lowBalanceProviders++;
        }
      } catch { /* opcional */ }

      // Classificação
      if (counters.stuckOrders > 0 || counters.criticalAlerts > 0 || counters.databaseErrors > 0) {
        status = "red";
        const parts: string[] = [];
        if (counters.stuckOrders > 0) {
          parts.push(`${counters.stuckOrders} pedido(s) pago(s) travado(s)`);
          actions.push({
            id: "reprocess-stuck",
            label: `Reprocessar ${counters.stuckOrders} pedido(s) travado(s)`,
            href: "/admin", // Pasta é controlada por estado interno no componente Admin, href base é suficiente
            urgency: "high",
          });
        }
        if (counters.criticalAlerts > 0) {
          parts.push(`${counters.criticalAlerts} alerta(s) crítico(s)`);
          actions.push({
            id: "view-critical",
            label: `Ver ${counters.criticalAlerts} alerta(s) crítico(s)`,
            href: "/admin",
            urgency: "high",
          });
        }
        if (counters.databaseErrors > 0) {
          parts.push(`${counters.databaseErrors} erro(s) de banco no checkout`);
          actions.push({
            id: "check-db-health",
            label: "Verificar Saúde da Infraestrutura",
            href: "/admin",
            urgency: "high",
          });
        }
        headline = `🔴 ${parts.join(" · ")} — abrir agora`;
        summary = "Cliente pode estar sendo afetado. Resolver imediatamente.";
      } else if (counters.pendingRecovery > 0 || counters.lowBalanceProviders > 0 || counters.warningAlerts >= 5 || counters.invalidTargetAnomalies > 0) {
        status = "yellow";
        const parts: string[] = [];
        if (counters.pendingRecovery > 0) {
          parts.push(`${counters.pendingRecovery} Pix abandonado(s)`);
          actions.push({
            id: "recovery",
            label: `Recuperar ${counters.pendingRecovery} Pix abandonado(s)`,
            href: "/admin",
            urgency: "medium",
          });
        }
        if (counters.lowBalanceProviders > 0) {
          parts.push(`${counters.lowBalanceProviders} fornecedor(es) com saldo baixo`);
          actions.push({
            id: "topup",
            label: `Recarregar ${counters.lowBalanceProviders} fornecedor(es)`,
            href: "/admin",
            urgency: "medium",
          });
        }
        if (counters.warningAlerts >= 5) {
          parts.push(`${counters.warningAlerts} avisos acumulados`);
          actions.push({
            id: "view-warnings",
            label: "Revisar avisos acumulados",
            href: "/admin",
            urgency: "low",
          });
        }
        if (counters.invalidTargetAnomalies > 0) {
          parts.push(`${counters.invalidTargetAnomalies} falhas de alvo (anomalia)`);
          actions.push({
            id: "check-funnel-targets",
            label: "Investigar falhas de @perfil",
            href: "/admin",
            urgency: "medium",
          });
        }
        headline = `🟡 ${parts.join(" · ")}`;
        summary = "Sem urgência, mas resolver no próximo momento livre.";
      }
    } catch (e) {
      // Falha de leitura vira amarelo, não vermelho — evita alarme por bug no próprio triage.
      status = "yellow";
      headline = "🟡 Não consegui ler todos os sinais agora";
      summary = e instanceof Error ? e.message : "erro desconhecido lendo triage";
    }

    return { status, headline, summary, actions, counters, generatedAt: new Date().toISOString() };
  });

