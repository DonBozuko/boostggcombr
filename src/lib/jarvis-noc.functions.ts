import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adminInput = z.object({ token: z.string().min(8) });

const TABLES = [
  "pedidos", "fornecedores", "monitoramento_saldo", "service_id_overrides",
  "services_cache", "admin_settings", "admin_audit_logs", "alerts",
  "bank_accounts", "jarvis_alerts", "scheduled_posts", "suppliers",
  "connection_tests", "pedidos_legacy",
];

export type NocSnapshot = {
  ok: true;
  systemHealth: { total: number; ok: number; tables: Array<{ name: string; ok: boolean; ms: number }> };
  fornecedores: Array<{ id: string; nome: string; status: string | null; saldo: number | null; saldoUsd: number | null; cotacao: number | null; ativo: boolean; falhas: number | null; ultima: string | null }>;
  // v251 — confiabilidade real por fornecedor (últimos 7 dias)
  confiabilidade: Array<{ slug: string; entregues: number; falhas: number; taxaSucesso: number | null; breakerAberto: boolean; ultimoErro: string | null }>;
  apiLatency: Array<{ name: string; ms: number; ok: boolean }>;
  pedidos: { total24h: number; pagos24h: number; pendentes24h: number };
  // v253 — Saldo de Guardas: prova que cada blindagem continua viva (24h)
  guardas: Array<{ key: string; label: string; count: number; last: string | null; alto: boolean }>;
  guardasMarginHold24h: number;
} | { ok: false; error: string };


export const jarvisNocSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }): Promise<NocSnapshot> => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { checkAllProvidersBalance } = await import("@/lib/monitor-saldo.server");

    await checkAllProvidersBalance().catch((e) => console.error("[jarvis-noc] balance refresh failed", e));

    const tableChecks = await Promise.all(TABLES.map(async (name) => {
      const t0 = Date.now();
      const { error } = await supabaseAdmin.from(name as any).select("*", { count: "exact", head: true }).limit(1);
      return { name, ok: !error, ms: Date.now() - t0 };
    }));

    const { data: fornecedoresRows } = await supabaseAdmin
      .from("fornecedores").select("id, nome, status, saldo_atual, cotacao_brl, ativo, falhas_consecutivas, ultima_verificacao");

    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: pedidos24 } = await supabaseAdmin
      .from("pedidos").select("status").gte("created_at", since);
    const pagos = (pedidos24 ?? []).filter((p: any) => ["paid","pago","completed","processing"].includes(p.status)).length;
    const pendentes = (pedidos24 ?? []).filter((p: any) => ["pending","pendente"].includes(p.status)).length;

    // v251 — Confiabilidade real por fornecedor (7 dias): entregues vs falhas
    // de despacho + estado do circuit breaker. Dado vem do banco, sem estimativa.
    const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
    const [{ data: pedidos7d }, { data: healthRows }] = await Promise.all([
      supabaseAdmin.from("pedidos").select("provider_slug, status").gte("created_at", since7d),
      supabaseAdmin.from("provider_health").select("slug, failure_count, unstable_until, last_error"),
    ]);
    const relMap = new Map<string, { entregues: number; falhas: number }>();
    for (const p of (pedidos7d ?? []) as any[]) {
      const slug = p.provider_slug;
      if (!slug) continue;
      const cur = relMap.get(slug) ?? { entregues: 0, falhas: 0 };
      if (["completed", "Enviado", "processing"].includes(p.status)) cur.entregues += 1;
      else if (["SMM_FAILED", "refunded", "MARGIN_HOLD"].includes(p.status)) cur.falhas += 1;
      relMap.set(slug, cur);
    }
    for (const h of (healthRows ?? []) as any[]) {
      if (!relMap.has(h.slug)) relMap.set(h.slug, { entregues: 0, falhas: 0 });
    }
    const confiabilidade = Array.from(relMap.entries()).map(([slug, v]) => {
      const h = ((healthRows ?? []) as any[]).find((x) => x.slug === slug);
      const tot = v.entregues + v.falhas;
      return {
        slug,
        entregues: v.entregues,
        falhas: v.falhas,
        taxaSucesso: tot > 0 ? Number(((v.entregues / tot) * 100).toFixed(1)) : null,
        breakerAberto: !!(h?.unstable_until && new Date(h.unstable_until).getTime() > Date.now()),
        ultimoErro: h?.last_error ?? null,
      };
    }).sort((a, b) => (b.entregues + b.falhas) - (a.entregues + a.falhas));


    // v253 — Saldo de Guardas (24h): quantas vezes cada trava atuou.
    const { summarizeGuards } = await import("@/lib/guards-summary");
    const [{ data: guardRows }, { count: marginHoldCount }] = await Promise.all([
      supabaseAdmin.from("admin_audit_logs").select("action, created_at").gte("created_at", since).limit(2000),
      supabaseAdmin.from("pedidos").select("id", { count: "exact", head: true })
        .eq("status", "MARGIN_HOLD").gte("created_at", since),
    ]);
    const guardas = summarizeGuards((guardRows ?? []) as any[]);

    // v191 — Health probe: qualquer resposta HTTP < 500 conta como "API viva"
    // (raiz de smmhype.com / api.mercadopago.com devolve 404/405 e não é falha).
    // Falha real = timeout, DNS, 5xx, ou latência > 3s.
    const probeLatency = async (name: string, url: string) => {
      const t0 = Date.now();
      try {
        const r = await fetch(url, { method: "GET", signal: AbortSignal.timeout(3000) });
        const ms = Date.now() - t0;
        return { name, ms, ok: r.status < 500 && ms < 3000 };
      } catch {
        return { name, ms: Date.now() - t0, ok: false };
      }
    };
    const apiLatency = await Promise.all([
      probeLatency("SMMhype", "https://smmhype.com/"),
      probeLatency("MercadoPago", "https://api.mercadopago.com/"),
      probeLatency("Supabase", `${process.env.SUPABASE_URL}/rest/v1/`),
    ]);

    const okCount = tableChecks.filter((t) => t.ok).length;
    return {
      ok: true,
      systemHealth: { total: tableChecks.length, ok: okCount, tables: tableChecks },
      fornecedores: (fornecedoresRows ?? []).map((f: any) => {
        const saldoBrl = f.saldo_atual != null ? Number(f.saldo_atual) : null;
        const cot = f.cotacao_brl != null ? Number(f.cotacao_brl) : null;
        const saldoUsd = saldoBrl != null && cot && cot > 0 ? Number((saldoBrl / cot).toFixed(2)) : null;
        return {
          id: f.id, nome: f.nome, status: f.status, saldo: saldoBrl, saldoUsd, cotacao: cot, ativo: !!f.ativo,
          falhas: f.falhas_consecutivas, ultima: f.ultima_verificacao,
        };
      }),
      confiabilidade,
      apiLatency,
      pedidos: { total24h: pedidos24?.length ?? 0, pagos24h: pagos, pendentes24h: pendentes },
      guardas,
      guardasMarginHold24h: marginHoldCount ?? 0,

    };
  });

const CRITICAL_KEYWORDS = ["deletar","delete","drop","apagar","remover api","trocar chave","alterar margem","mudar lucro","modificar lucro","alterar lucro","rotacionar chave"];

export type JarvisChatResp =
  | { ok: true; answer: string; data?: any; requiresConfirmation?: false }
  | { ok: true; requiresConfirmation: true; reason: string; question: string }
  | { ok: false; error: string };

export const jarvisChat = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(8), question: z.string().min(2).max(500) }).parse(input))
  .handler(async ({ data }): Promise<JarvisChatResp> => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };

    const qLower = data.question.toLowerCase();
    if (CRITICAL_KEYWORDS.some((k) => qLower.includes(k))) {
      return {
        ok: true, requiresConfirmation: true,
        reason: "Ação crítica detectada: requer confirmação manual do Diretor.",
        question: data.question,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const start7d = new Date(Date.now() - 7 * 86400_000).toISOString();
    const start30d = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [{ data: hoje }, { data: forns }, { data: pendentes }, { data: tre7 }, { data: tre30 }] = await Promise.all([
      supabaseAdmin.from("pedidos").select("status, valor, custo_real, created_at").gte("created_at", startDay),
      supabaseAdmin.from("fornecedores").select("nome, status, saldo_atual, ativo, falhas_consecutivas, ultima_verificacao"),
      supabaseAdmin.from("pedidos").select("id, status, valor, created_at").in("status", ["pending","pendente"]).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("admin_treasury" as any).select("faturamento, lucro_liquido, taxa_pix, custo_api, occurred_at").gte("occurred_at", start7d),
      supabaseAdmin.from("admin_treasury" as any).select("faturamento, lucro_liquido").gte("occurred_at", start30d),
    ]);

    const pagosHoje = (hoje ?? []).filter((r: any) => ["paid","pago","completed","processing"].includes(r.status));
    const receitaHoje = pagosHoje.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
    const custoHoje = pagosHoje.reduce((s: number, r: any) => s + Number(r.custo_real || 0), 0);
    const lucroHoje = receitaHoje - custoHoje;

    const sum = (rows: any[] | null, k: string) => (rows ?? []).reduce((s, r) => s + Number(r[k] || 0), 0);
    const fat7d = sum(tre7 as any, "faturamento");
    const lucro7d = sum(tre7 as any, "lucro_liquido");
    const fat30d = sum(tre30 as any, "faturamento");
    const lucro30d = sum(tre30 as any, "lucro_liquido");
    const previsao30d = lucro7d > 0 ? Number(((lucro7d / 7) * 30).toFixed(2)) : 0;

    const ctx = {
      receitaHoje, lucroHoje, totalPagosHoje: pagosHoje.length,
      pedidosPendentes: pendentes?.length ?? 0,
      tesouraria: { fat7d, lucro7d, fat30d, lucro30d, previsao30d },
      fornecedores: forns ?? [],
    };

    // Fallback determinístico local (sem tokens / sem nuvem).
    const localAnswer = () => {
      const f = (ctx.fornecedores as any[]) ?? [];
      const ativo = f.find((x) => x.ativo);
      const saldo = ativo?.saldo_atual ?? 0;
      const margem = receitaHoje > 0 ? ((lucroHoje / receitaHoje) * 100).toFixed(1) : "0.0";
      return [
        `Diretor, modo local ativo (sem nuvem).`,
        `📊 Hoje: R$ ${receitaHoje.toFixed(2)} receita · R$ ${lucroHoje.toFixed(2)} lucro (${margem}%) · ${pagosHoje.length} pagos · ${ctx.pedidosPendentes} pendentes.`,
        `🏦 7d: R$ ${fat7d.toFixed(2)} / lucro R$ ${lucro7d.toFixed(2)} · 30d projetado R$ ${previsao30d.toFixed(2)}.`,
        `⚡ Fornecedor ativo: ${ativo?.nome ?? "—"} · saldo R$ ${Number(saldo).toFixed(2)}.`,
      ].join(" ");
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: true, answer: localAnswer(), data: ctx };

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é J.A.R.V.I.S., assistente executivo do Diretor Fabiano na Elite Boost Prime. Responda em PT-BR, curto (max 4 linhas), com dados reais do contexto. Trate o usuário por 'Diretor'." },
            { role: "user", content: `Pergunta: ${data.question}\n\nDados reais (JSON):\n${JSON.stringify(ctx)}` },
          ],
        }),
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
      if (!r.ok) {
        // 429 (rate limit) / 402 (sem créditos) / 5xx → fallback local determinístico.
        return { ok: true, answer: localAnswer(), data: { ...ctx, fallback: true, upstream: r.status } };
      }
      const json: any = await r.json();
      const answer = json?.choices?.[0]?.message?.content;
      if (!answer) return { ok: true, answer: localAnswer(), data: { ...ctx, fallback: true } };
      return { ok: true, answer, data: ctx };
    } catch {
      return { ok: true, answer: localAnswer(), data: { ...ctx, fallback: true } };
    }
  });


export const jarvisFailoverAtivo = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!(await import("@/lib/admin-token.server")).isAdminToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: forns } = await supabaseAdmin
      .from("fornecedores")
      .select("id, nome, saldo_atual, falhas_consecutivas, ativo, status");
    if (!forns?.length) return { ok: false as const, error: "NO_SUPPLIERS" };

    const ativo = forns.find((f: any) => f.ativo);
    if (!ativo) return { ok: false as const, error: "NO_ACTIVE" };
    if ((ativo.falhas_consecutivas ?? 0) < 3) {
      return { ok: true as const, action: "noop", reason: "Fornecedor ativo estável" };
    }
    const candidato = forns
      .filter((f: any) => !f.ativo && Number(f.saldo_atual ?? 0) > 0)
      .sort((a: any, b: any) => Number(b.saldo_atual ?? 0) - Number(a.saldo_atual ?? 0))[0];
    if (!candidato) return { ok: true as const, action: "noop", reason: "Sem reserva elegível" };

    await supabaseAdmin.from("fornecedores").update({ ativo: false } as any).eq("id", ativo.id);
    await supabaseAdmin.from("fornecedores").update({ ativo: true, falhas_consecutivas: 0 } as any).eq("id", candidato.id);
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_email: "system@jarvis",
      action: "jarvis_failover",
      detail: { from: ativo.nome, to: candidato.nome },
    } as any);
    return { ok: true as const, action: "switched", from: ativo.nome, to: candidato.nome };
  });
