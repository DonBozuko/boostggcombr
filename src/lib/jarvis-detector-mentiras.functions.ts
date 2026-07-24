import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * JARVIS DETECTOR DE MENTIRAS v49
 * v244: exige ADMIN_TOKEN (finding jarvis_ops_noauth).
 */
export const runJarvisLieDetector = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }) => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return {
        version: "v49",
        timestamp: new Date().toISOString(),
        passed: 0,
        total: 0,
        blockDeploy: true,
        checks: [{ id: "auth", label: "Autenticação admin", ok: false, detail: "UNAUTHORIZED" }],
      };
    }
    const checks: Array<{ id: string; label: string; ok: boolean; detail: string }> = [];
    let blockDeploy = false;

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // 1. pricing_items — mapeamento pacote→rota
      const { data: items, error: itemsErr } = await supabaseAdmin
        .from("pricing_items")
        .select("pacote, price_brl, provider_service_id, smmhype_service_id, smmpanel_service_id, verified_service_id, smmhype_auto_id, smmpanel_auto_id, verified_auto_id");
      if (itemsErr) {
        checks.push({ id: "pricing_items", label: "pricing_items acessível", ok: false, detail: itemsErr.message });
        blockDeploy = true;
      } else {
        const total = items?.length ?? 0;
        const broken = (items ?? []).filter((i: Record<string, unknown>) => {
          const semPreco = !i.price_brl || Number(i.price_brl) < 5;
          const semRota =
            !i.provider_service_id && !i.smmhype_service_id && !i.smmpanel_service_id && !i.verified_service_id &&
            !i.smmhype_auto_id && !i.smmpanel_auto_id && !i.verified_auto_id;
          return semPreco || semRota;
        });
        const ok = total > 0 && broken.length === 0;
        const amostra = broken.slice(0, 5).map((b: Record<string, unknown>) => b.pacote).join(", ");
        checks.push({
          id: "pricing_items",
          label: `Mapeamento pacote→rota (${total} itens, ${broken.length} órfãos)`,
          ok,
          detail: ok ? "todo pacote com rota + preço" : `${broken.length} sem rota/preço: ${amostra}${broken.length > 5 ? "…" : ""}`,
        });
        if (!ok) blockDeploy = true;
      }

      // 2. Fornecedor ativo
      const { data: forn } = await supabaseAdmin
        .from("fornecedores")
        .select("nome, ativo")
        .eq("ativo", true);
      const fOk = (forn?.length ?? 0) >= 1;
      checks.push({
        id: "fornecedor_ativo",
        label: "Fornecedor ativo",
        ok: fOk,
        detail: fOk ? (forn ?? []).map((f) => f.nome).join(", ") : "nenhum fornecedor ativo",
      });
      if (!fOk) blockDeploy = true;

      // 3. Alertas Jarvis ABERTOS (últimas 2h) — SINTOMA REAL
      // v239: antes contava qualquer linha das últimas 6h, inclusive as marcadas
      // "✅ RESOLVIDO" e as já superadas por uma auditoria posterior limpa da mesma
      // origem. Resultado: alerta antigo/corrigido mantinha o deploy bloqueado.
      const { data: alertas } = await supabaseAdmin
        .from("jarvis_alerts")
        .select("severidade, origem, mensagem, created_at")
        .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });
      const abertos = (alertas ?? []).filter((a) => !String(a.mensagem ?? "").startsWith("✅ RESOLVIDO"));
      // Só o alerta mais recente de cada origem vale: se a mesma rotina rodou depois
      // e não repetiu o problema, o alerta anterior está superado.
      const vistos = new Set<string>();
      const vigentes = abertos.filter((a) => {
        const key = String(a.origem ?? "desconhecida");
        if (vistos.has(key)) return false;
        vistos.add(key);
        return true;
      });
      const errors = vigentes.filter((a) => a.severidade === "error" || a.severidade === "critical");
      const warns = vigentes.filter((a) => a.severidade === "warning");
      const alertOk = errors.length === 0;
      checks.push({
        id: "jarvis_alerts",
        label: `Alertas abertos nas últimas 2h (${errors.length} erros, ${warns.length} avisos)`,
        ok: alertOk,
        detail: alertOk
          ? warns.length > 0
            ? `sem erros — último aviso: ${warns[0]?.mensagem?.slice(0, 60)}`
            : "silêncio total, tudo saudável"
          : `⚠️ ${errors[0]?.mensagem?.slice(0, 80)}`,
      });
      if (!alertOk) blockDeploy = true;


      // 4. Pedidos travados (paid há mais de 15min sem provider_order_id) — SINTOMA REAL
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { data: travados } = await supabaseAdmin
        .from("pedidos")
        .select("id, mercado_pago_id, created_at")
        .eq("status", "paid")
        .is("provider_order_id", null)
        .lt("created_at", cutoff);
      const travadosCount = travados?.length ?? 0;
      const trOk = travadosCount === 0;
      checks.push({
        id: "pedidos_travados",
        label: `Pedidos pagos sem despacho >15min (${travadosCount})`,
        ok: trOk,
        detail: trOk ? "todos os pagos foram despachados" : `🚨 ${travadosCount} travados — reconciliador não pegou`,
      });
      if (!trOk) blockDeploy = true;

      // 5. Reconciliador rodando (audit log últimos 20min) — SINTOMA REAL
      const runCutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
      const { count: recRuns } = await supabaseAdmin
        .from("admin_audit_logs")
        .select("*", { count: "exact", head: true })
        .like("action", "pedido_reconciler_%")
        .gte("created_at", runCutoff);
      const recOk = (recRuns ?? 0) >= 1;
      checks.push({
        id: "reconciler_alive",
        label: `Reconciliador rodou nos últimos 20min (${recRuns ?? 0}x)`,
        ok: recOk,
        detail: recOk ? "cron ativo" : "🚨 cron parado — pedido travado não seria salvo",
      });
      if (!recOk) blockDeploy = true;

      // 6. Smoke test rodando (últimos 30min)
      const smokeCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { count: smokeRuns } = await supabaseAdmin
        .from("admin_audit_logs")
        .select("*", { count: "exact", head: true })
        .eq("action", "smoke_test_v178")
        .gte("created_at", smokeCutoff);
      const smOk = (smokeRuns ?? 0) >= 1;
      checks.push({
        id: "smoke_alive",
        label: `Smoke test rodou nos últimos 30min (${smokeRuns ?? 0}x)`,
        ok: smOk,
        detail: smOk ? "auditoria ativa" : "cron de auditoria parado",
      });
      if (!smOk) blockDeploy = true;

      // 7. Webhook MP: quantas vezes o pooling teve que salvar nas últimas 24h
      const dayCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: contingencias } = await supabaseAdmin
        .from("jarvis_alerts")
        .select("*", { count: "exact", head: true })
        .eq("origem", "contingency-pooling")
        .gte("created_at", dayCutoff);
      const cn = contingencias ?? 0;
      // >5 em 24h = webhook está falhando de verdade
      const wOk = cn <= 5;
      checks.push({
        id: "webhook_mp",
        label: `Webhook MP — pooling salvou ${cn}x em 24h`,
        ok: wOk,
        detail: wOk
          ? cn === 0 ? "webhook 100%" : `${cn} salvamentos — dentro do aceitável`
          : `🚨 ${cn} salvamentos — assinatura do webhook está falhando`,
      });
      if (!wOk) blockDeploy = true;

      // 8. Tesouraria acessível
      const { error: trErr } = await supabaseAdmin
        .from("admin_treasury")
        .select("id", { count: "exact", head: true });
      checks.push({
        id: "treasury",
        label: "admin_treasury ledger",
        ok: !trErr,
        detail: trErr?.message ?? "ledger acessível",
      });
      if (trErr) blockDeploy = true;
    } catch (e) {
      checks.push({
        id: "fatal",
        label: "Detector de mentiras",
        ok: false,
        detail: e instanceof Error ? e.message : String(e),
      });
      blockDeploy = true;
    }

    const passed = checks.filter((c) => c.ok).length;
    return {
      version: "v49",
      timestamp: new Date().toISOString(),
      passed,
      total: checks.length,
      blockDeploy,
      checks,
    };
  });

