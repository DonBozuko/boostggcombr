import { createServerFn } from "@tanstack/react-start";

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
  };
  generatedAt: string;
};

export const getJarvisTriage = createServerFn({ method: "GET" }).handler(
  async (): Promise<TriageDigest> => {
    const now = Date.now();
    const counters = {
      criticalAlerts: 0,
      warningAlerts: 0,
      stuckOrders: 0,
      lowBalanceProviders: 0,
      pendingRecovery: 0,
    };
    const actions: TriageAction[] = [];
    let status: TriageDigest["status"] = "green";
    let headline = "Tudo em ordem, pode relaxar";
    let summary = "Nenhuma ação urgente. Sistema operando normal.";

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const since6h = new Date(now - 6 * 60 * 60 * 1000).toISOString();

      // 1. Alertas abertos últimas 6h
      const { data: alertas } = await supabaseAdmin
        .from("jarvis_alerts")
        .select("severidade, mensagem, created_at")
        .gte("created_at", since6h);
      for (const a of alertas ?? []) {
        const s = String((a as { severidade?: string }).severidade ?? "").toLowerCase();
        if (s === "critical" || s === "error") counters.criticalAlerts++;
        else if (s === "warning") counters.warningAlerts++;
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

      // 3. Fila de recuperação Pix (novos)
      const { count: pending } = await supabaseAdmin
        .from("pix_recovery_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", "novo");
      counters.pendingRecovery = pending ?? 0;

      // 4. Saldos baixos — só se existir a tabela provider_health / fornecedores
      try {
        const { data: fh } = await supabaseAdmin
          .from("fornecedores")
          .select("nome, saldo_brl, saldo_alerta_brl, ativo")
          .eq("ativo", true);
        for (const f of (fh ?? []) as Array<{ saldo_brl: number | null; saldo_alerta_brl: number | null }>) {
          const bal = Number(f.saldo_brl ?? 0);
          const thr = Number(f.saldo_alerta_brl ?? 30);
          if (bal > 0 && bal < thr) counters.lowBalanceProviders++;
        }
      } catch { /* opcional */ }

      // Classificação
      if (counters.stuckOrders > 0 || counters.criticalAlerts > 0) {
        status = "red";
        const parts: string[] = [];
        if (counters.stuckOrders > 0) {
          parts.push(`${counters.stuckOrders} pedido(s) pago(s) travado(s)`);
          actions.push({
            id: "reprocess-stuck",
            label: `Reprocessar ${counters.stuckOrders} pedido(s) travado(s)`,
            href: "/admin?folder=buscas",
            urgency: "high",
          });
        }
        if (counters.criticalAlerts > 0) {
          parts.push(`${counters.criticalAlerts} alerta(s) crítico(s)`);
          actions.push({
            id: "view-critical",
            label: `Ver ${counters.criticalAlerts} alerta(s) crítico(s)`,
            href: "/admin?folder=auditoria",
            urgency: "high",
          });
        }
        headline = `🔴 ${parts.join(" · ")} — abrir agora`;
        summary = "Cliente pode estar sendo afetado. Resolver imediatamente.";
      } else if (counters.pendingRecovery > 0 || counters.lowBalanceProviders > 0 || counters.warningAlerts >= 5) {
        status = "yellow";
        const parts: string[] = [];
        if (counters.pendingRecovery > 0) {
          parts.push(`${counters.pendingRecovery} Pix abandonado(s)`);
          actions.push({
            id: "recovery",
            label: `Recuperar ${counters.pendingRecovery} Pix abandonado(s)`,
            href: "/admin?folder=buscas",
            urgency: "medium",
          });
        }
        if (counters.lowBalanceProviders > 0) {
          parts.push(`${counters.lowBalanceProviders} fornecedor(es) com saldo baixo`);
          actions.push({
            id: "topup",
            label: `Recarregar ${counters.lowBalanceProviders} fornecedor(es)`,
            href: "/admin?folder=tesouraria",
            urgency: "medium",
          });
        }
        if (counters.warningAlerts >= 5) {
          parts.push(`${counters.warningAlerts} avisos acumulados`);
          actions.push({
            id: "view-warnings",
            label: "Revisar avisos acumulados",
            href: "/admin?folder=auditoria",
            urgency: "low",
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
  },
);
