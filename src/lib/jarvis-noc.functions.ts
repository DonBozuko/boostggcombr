import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adminInput = z.object({ token: z.string().min(8) });
function checkToken(token: string) {
  return !!process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

const TABLES = [
  "pedidos", "fornecedores", "monitoramento_saldo", "service_id_overrides",
  "services_cache", "admin_settings", "admin_audit_logs", "alerts",
  "bank_accounts", "jarvis_alerts", "scheduled_posts", "suppliers",
  "connection_tests", "pedidos_legacy",
];

export type NocSnapshot = {
  ok: true;
  systemHealth: { total: number; ok: number; tables: Array<{ name: string; ok: boolean; ms: number }> };
  fornecedores: Array<{ id: string; nome: string; status: string | null; saldo: number | null; ativo: boolean; falhas: number | null; ultima: string | null }>;
  apiLatency: Array<{ name: string; ms: number; ok: boolean }>;
  pedidos: { total24h: number; pagos24h: number; pendentes24h: number };
} | { ok: false; error: string };

export const jarvisNocSnapshot = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }): Promise<NocSnapshot> => {
    if (!checkToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tableChecks = await Promise.all(TABLES.map(async (name) => {
      const t0 = Date.now();
      const { error } = await supabaseAdmin.from(name as any).select("*", { count: "exact", head: true }).limit(1);
      return { name, ok: !error, ms: Date.now() - t0 };
    }));

    const { data: fornecedoresRows } = await supabaseAdmin
      .from("fornecedores").select("id, nome, status, saldo_atual, ativo, falhas_consecutivas, ultima_verificacao");

    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: pedidos24 } = await supabaseAdmin
      .from("pedidos").select("status").gte("created_at", since);
    const pagos = (pedidos24 ?? []).filter((p: any) => ["paid","pago","completed"].includes(p.status)).length;
    const pendentes = (pedidos24 ?? []).filter((p: any) => ["pending","pendente"].includes(p.status)).length;

    const probeLatency = async (name: string, url: string) => {
      const t0 = Date.now();
      try { const r = await fetch(url, { method: "GET" }); return { name, ms: Date.now() - t0, ok: r.ok }; }
      catch { return { name, ms: Date.now() - t0, ok: false }; }
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
      fornecedores: (fornecedoresRows ?? []).map((f: any) => ({
        id: f.id, nome: f.nome, status: f.status, saldo: f.saldo_atual, ativo: !!f.ativo,
        falhas: f.falhas_consecutivas, ultima: f.ultima_verificacao,
      })),
      apiLatency,
      pedidos: { total24h: pedidos24?.length ?? 0, pagos24h: pagos, pendentes24h: pendentes },
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
    if (!checkToken(data.token)) return { ok: false, error: "UNAUTHORIZED" };

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

    const pagosHoje = (hoje ?? []).filter((r: any) => ["paid","pago","completed"].includes(r.status));
    const receitaHoje = pagosHoje.reduce((s: number, r: any) => s + Number(r.valor || 0), 0);
    const custoHoje = pagosHoje.reduce((s: number, r: any) => s + Number(r.custo_real || 0), 0);
    const lucroHoje = receitaHoje - custoHoje;

    const ctx = {
      receitaHoje, lucroHoje, totalPagosHoje: pagosHoje.length,
      pedidosPendentes: pendentes?.length ?? 0,
      fornecedores: forns ?? [],
    };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: true, answer: `📊 Receita hoje: R$ ${receitaHoje.toFixed(2)} · Lucro: R$ ${lucroHoje.toFixed(2)} · Pagos: ${pagosHoje.length} · Pendentes: ${ctx.pedidosPendentes}`, data: ctx };
    }

    try {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "Você é J.A.R.V.I.S., assistente executivo do Diretor Fabiano na EliteBoost Prime. Responda em PT-BR, curto (max 4 linhas), com dados reais do contexto. Trate o usuário por 'Diretor'." },
            { role: "user", content: `Pergunta: ${data.question}\n\nDados reais (JSON):\n${JSON.stringify(ctx)}` },
          ],
        }),
      });
      const json: any = await r.json();
      const answer = json?.choices?.[0]?.message?.content ?? "Sem resposta do gateway.";
      return { ok: true, answer, data: ctx };
    } catch (e: any) {
      return { ok: true, answer: `Falha no gateway: ${e?.message ?? e}. Dados brutos: receita R$ ${receitaHoje.toFixed(2)}, lucro R$ ${lucroHoje.toFixed(2)}.`, data: ctx };
    }
  });

export const jarvisFailoverAtivo = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" };
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
      action: "jarvis_failover", details: { from: ativo.nome, to: candidato.nome },
    } as any);
    return { ok: true as const, action: "switched", from: ativo.nome, to: candidato.nome };
  });
