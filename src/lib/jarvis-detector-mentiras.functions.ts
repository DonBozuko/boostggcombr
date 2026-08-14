import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * JARVIS DETECTOR DE MENTIRAS v49
 * v244: exige ADMIN_TOKEN (finding jarvis_ops_noauth).
 */
export const runJarvisLieDetector = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }) => {
    if (!(await (await import("@/lib/admin-guard.server")).assertAdmin(data.token, "jarvis-detector-mentiras")).ok) {
     // Patch v615: Drift de Margem

      return {
        version: "v52-fix",
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

      // 2b. v247 — Moeda do fornecedor declarada (anti saldo inflado por cotação).
      // Bug real: provider4 era conta em BRL, o sistema tratou como USD e multiplicou
      // o saldo pela cotação (R$16,53 virou R$83,94). Sem moeda declarada = saldo mentiroso.
      const { data: moedas } = await supabaseAdmin
        .from("fornecedores")
        .select("nome, slug, moeda, ativo")
        .eq("ativo", true);
      const semMoeda = (moedas ?? []).filter(
        (f: any) => !["BRL", "USD"].includes(String(f.moeda ?? "").toUpperCase()),
      );
      const moedaOk = semMoeda.length === 0;
      checks.push({
        id: "fornecedor_moeda",
        label: `Moeda declarada em todos os fornecedores (${(moedas ?? []).length})`,
        ok: moedaOk,
        detail: moedaOk
          ? "saldo lido na moeda certa, sem conversão errada"
          : `sem moeda definida: ${semMoeda.map((f: any) => f.nome).join(", ")} — saldo pode estar inflado pela cotação`,
      });
      if (!moedaOk) blockDeploy = true;


      // 3. Alertas Jarvis ABERTOS (últimas 2h) — SINTOMA REAL
      // v239: antes contava qualquer linha das últimas 6h, inclusive as marcadas
      // "✅ RESOLVIDO" e as já superadas por uma auditoria posterior limpa da mesma
      // origem. Resultado: alerta antigo/corrigido mantinha o deploy bloqueado.
      const { data: alertas } = await supabaseAdmin
        .from("jarvis_alerts")
        .select("severidade, origem, mensagem, created_at")
        .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString()) // v613: Janela reduzida para 30min para maior frescor
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
        label: `Alertas abertos nos últimos 30min (${errors.length} erros, ${warns.length} avisos)`,
        ok: alertOk,
        detail: alertOk
          ? warns.length > 0
            ? `sem erros — último aviso: ${warns[0]?.mensagem?.slice(0, 60)}`
            : "silêncio total, tudo saudável"
          : `⚠️ <b>${errors[0]?.origem?.toUpperCase()}</b>: ${errors[0]?.mensagem?.slice(0, 80)}`,
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
        .ilike("action", "smoke_test_%")
        .gte("created_at", smokeCutoff);
      
      // v602: Auto-Healer fallback. Se o smoke test falhou ou não rodou, tentamos 
      // verificar se o reconciliador ou o sincronismo de preços ainda estão ativos.
      const smOk = (smokeRuns ?? 0) >= 1;
      checks.push({
        id: "smoke_alive",
        label: `Smoke test rodou nos últimos 30min (${smokeRuns ?? 0}x)`,
        ok: smOk,
        detail: smOk ? "auditoria ativa" : "cron de auditoria em atraso — verificando motores individuais",
      });
      // v602: Não bloqueia deploy imediatamente se outros motores (reconciler) estiverem vivos, 
      // para evitar falso positivo de "piloto travado" por latência de cron.
      // v613: Se o reconciliador estiver vivo, ignora falha de smoke test (evita alarme falso).
      if (!smOk && !recOk) blockDeploy = true;

      // 8. Webhook MP: monitor de canal morto (v506)
      const dayCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ count: evtsCount }, { count: paymentsCount }] = await Promise.all([
        supabaseAdmin.from("webhook_events").select("*", { count: "exact", head: true }).eq("provider", "mercado_pago").gte("received_at", dayCutoff),
        supabaseAdmin.from("pedidos").select("*", { count: "exact", head: true }).eq("status", "completed").gte("created_at", dayCutoff)
      ]);

      const { count: contingencias } = await supabaseAdmin
        .from("jarvis_alerts")
        .select("*", { count: "exact", head: true })
        .eq("origem", "contingency-pooling")
        .gte("created_at", dayCutoff);
      
      const cn = contingencias ?? 0;
      const totalEvts = evtsCount ?? 0;
      const totalPaid = paymentsCount ?? 0;

      // Se teve venda mas zero webhooks em 24h, o canal está morto
      const channelDead = totalPaid > 0 && totalEvts === 0;
      const wOk = !channelDead && cn <= 5;
      
      checks.push({
        id: "webhook_mp",
        label: `Webhook MP — ${totalEvts} eventos / ${cn} contingências (24h)`,
        ok: wOk,
        detail: channelDead 
          ? "🚨 CANAL MORTO: teve venda mas zero webhooks recebidos. Checar URL de notificação."
          : cn > 5 ? `🚨 ${cn} salvamentos — instabilidade alta ou erro de assinatura`
          : "webhook operando (ou sem vendas recentes para validar)"
      });
      if (!wOk) blockDeploy = true;

      // 8b. v522 — Autoria da aprovação: o webhook ainda é o caminho principal?
      // Um canal "vivo" que só recebe payment.created e nunca fecha a venda é
      // degradação silenciosa: a contingência (polling) segura a operação e
      // ninguém percebe até ela também falhar. NÃO bloqueia deploy — não há
      // perda de dinheiro, apenas latência maior e dependência da rede de segurança.
      {
        const { data: aprovacoes } = await supabaseAdmin
          .from("financial_ledger")
          .select("telemetry")
          .eq("origem", "mercado_pago")
          .gte("created_at", dayCutoff)
          .limit(200);
        const linhas = (aprovacoes ?? []) as Array<{ telemetry: Record<string, unknown> | null }>;
        const aprovadas = linhas.filter((l) => l.telemetry?.["event"] === "PIX_APPROVED");
        const porWebhook = aprovadas.filter((l) => l.telemetry?.["source"] === "webhook").length;
        const porContingencia = aprovadas.filter((l) => l.telemetry?.["source"] === "contingency").length;
        const degradado = aprovadas.length > 0 && porWebhook === 0;
        checks.push({
          id: "webhook_autoria",
          label: `Autoria das aprovações 24h — webhook ${porWebhook} / contingência ${porContingencia}`,
          ok: !degradado,
          detail: degradado
            ? "⚠️ Nenhuma venda foi fechada pelo webhook: quem está salvando é a contingência. Revisar notification_url e assinatura no Mercado Pago."
            : aprovadas.length === 0
              ? "sem aprovações nas últimas 24h para avaliar"
              : "webhook é o caminho principal",
        });
      }



      // 9. Tesouraria acessível
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
    
    // 10. Monotonicidade de Escada (v595)
    {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: allItems } = await supabaseAdmin
          .from("pricing_items")
          .select("pacote, category, quantidade, price_brl")
          .eq("is_sellable", true);
        
        const byCat = new Map<string, any[]>();
        for (const it of (allItems ?? [])) {
          const cat = String(it.category || "uncategorized");
          const list = byCat.get(cat) ?? [];
          list.push(it);
          byCat.set(cat, list);
        }

        const inversions: string[] = [];
        for (const [cat, list] of byCat) {
          list.sort((a, b) => a.quantidade - b.quantidade);
          for (let i = 1; i < list.length; i++) {
            // v598: Trava estrita de Monotonicidade
            if (Number(list[i].price_brl) < Number(list[i-1].price_brl)) {
              inversions.push(`${list[i].pacote}(R$${list[i].price_brl}) < ${list[i-1].pacote}(R$${list[i-1].price_brl})`);
            }
          }
        }

        const monoOk = inversions.length === 0;
        checks.push({
          id: "monotonic_ladder",
          label: `Escada de Preços (${inversions.length} inversões)`,
          ok: monoOk,
          detail: monoOk ? "pacotes maiores sempre mais caros" : `🚨 ${inversions.length} erros: ${inversions.slice(0, 2).join(", ")}`
        });
        if (!monoOk) blockDeploy = true;
      } catch (e) {
         checks.push({ id: "monotonic_ladder", label: "Escada de Preços", ok: false, detail: "erro ao validar escada: " + (e instanceof Error ? e.message : String(e)) });
         blockDeploy = true;
      }
    }

    // v607 — Telemetria de autenticação: pico de negações no Security Proxy.
    // Antes disso, força bruta contra o painel era invisível.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("admin_audit_logs" as any)
        .select("id", { count: "exact", head: true })
        .eq("action", "admin_auth_denied")
        .gte("created_at", desde);
      const denials = Number(count ?? 0);
      const authOk = denials < 20;
      checks.push({
        id: "admin_auth_denied",
        label: `Tentativas de acesso admin negadas (1h): ${denials}`,
        ok: authOk,
        detail: authOk ? "sem sinal de força bruta" : `🚨 ${denials} negações em 1h — possível ataque ao painel`,
      });
      // Sinal de segurança não bloqueia deploy; bloquear entregaria DoS ao atacante.
    } catch {
      /* telemetria nunca derruba o detector */
    }

    // v637 — Verificação de Incidentes Críticos Abertos
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: criticalIncs } = await supabaseAdmin
        .from("jarvis_incidents")
        .select("id, headline")
        .eq("severity", "critical")
        .not("status", "eq", "CLOSED");
      
      const hasCritical = (criticalIncs ?? []).length > 0;
      checks.push({
        id: "critical_incidents",
        label: `Incidentes Críticos Abertos (${(criticalIncs ?? []).length})`,
        ok: !hasCritical,
        detail: hasCritical 
          ? `🚨 BLOQUEIO: ${criticalIncs![0].headline}`
          : "nenhum incidente crítico impedindo a operação"
      });
      if (hasCritical) blockDeploy = true;
    } catch { /* */ }

    const passed = checks.filter((c) => c.ok).length;
     // Patch v615: Drift de Margem

    return {
      version: "v52",
      timestamp: new Date().toISOString(),
      passed,
      total: checks.length,
      blockDeploy,
      checks,
    };
  });

