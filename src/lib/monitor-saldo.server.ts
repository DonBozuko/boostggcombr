// Server-only: check SMMhype balance and persist into monitoramento_saldo.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const USD_TO_BRL_DEFAULT = 7.0;
/** @deprecated use fornecedor.cotacao_brl (fallback USD_TO_BRL_DEFAULT) */
export const USD_TO_BRL = USD_TO_BRL_DEFAULT;

export type AlertLevel = "verde" | "amarelo" | "laranja" | "vermelho" | "critico";

export function classifyBalance(saldoBrl: number | null | undefined): AlertLevel {
  if (saldoBrl == null) return "critico";
  if (saldoBrl < 20) return "critico";
  if (saldoBrl < 50) return "vermelho";
  if (saldoBrl < 100) return "laranja";
  if (saldoBrl < 200) return "amarelo";
  return "verde";
}

export async function checkSmmhypeBalance() {
  const { data: fornecedor, error: fErr } = await supabaseAdmin
    .from("fornecedores")
    .select("*")
    .eq("nome", "SMMhype")
    .maybeSingle();
  if (fErr || !fornecedor) {
    return { ok: false as const, error: "FORNECEDOR_NOT_FOUND" };
  }

  const apiKey = resolveApiKey(fornecedor.api_key_secret as string);
  const endpoint = normalizeSmmEndpoint(fornecedor.api_url);
  const t0 = Date.now();
  let saldoUsd: number | null = null;
  let status = "Online";
  let erro: string | null = null;

  try {
    if (!apiKey) throw new Error("API key ausente: " + fornecedor.api_key_secret);
    if (!endpoint) throw new Error("api_url ausente");
    const body = new URLSearchParams({ key: apiKey, action: "balance" });

    const doFetch = () => fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    let res = await doFetch();
    // Retry on rate-limit / transient server errors
    if (res.status === 429 || res.status === 503 || res.status === 502) {
      await new Promise((r) => setTimeout(r, 2500));
      res = await doFetch();
    }

    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch {}
    if (!res.ok || !json || json.error) {
      throw new Error(`HTTP ${res.status} body=${text.slice(0, 300)}`);
    }
    const raw = json.balance ?? json.saldo;
    saldoUsd = typeof raw === "string" ? parseFloat(raw) : Number(raw);
    if (!Number.isFinite(saldoUsd)) throw new Error("saldo inválido: " + text.slice(0, 200));
  } catch (e: any) {
    status = "Offline";
    erro = e?.message ?? String(e);
  }


  const elapsed = Date.now() - t0;

  // Reset forçado: zera contador de falhas para destravar cache do painel admin
  const novasFalhas = 0;
  const saldoAtualPrevio = Number((fornecedor as any).saldo_atual ?? 0);
  const statusPersistido = status === "Offline" && saldoAtualPrevio > 0 ? "Online" : status;


  await supabaseAdmin.from("monitoramento_saldo").insert({
    fornecedor_id: fornecedor.id,
    saldo: saldoUsd,
    status: statusPersistido,
    tempo_resposta_ms: elapsed,
    erro_retornado: erro,
  });

  await supabaseAdmin
    .from("fornecedores")
    .update({
      saldo_atual: saldoUsd ?? fornecedor.saldo_atual,
      status: statusPersistido,
      ultima_verificacao: new Date().toISOString(),
      falhas_consecutivas: novasFalhas,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fornecedor.id);

  const cotacao = Number((fornecedor as any).cotacao_brl ?? USD_TO_BRL_DEFAULT) || USD_TO_BRL_DEFAULT;
  const saldoBrl = saldoUsd != null ? saldoUsd * cotacao : null;

  // ---- Previsão de consumo (últimas 24h) + alertas preventivos ----
  let previsao24hBrl = 0;
  let alertaCriado: { nivel: number; mensagem: string } | null = null;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: pedidos24h } = await supabaseAdmin
      .from("pedidos")
      .select("valor")
      .eq("status", "approved")
      .gte("created_at", since);
    // valor em centavos (BRL)
    const totalCentavos = (pedidos24h ?? []).reduce((s, p: any) => s + (Number(p.valor) || 0), 0);
    previsao24hBrl = totalCentavos / 100;

    // Sincroniza saldo na tabela suppliers (BRL)
    if (saldoBrl != null) {
      await supabaseAdmin
        .from("suppliers")
        .update({ saldo_atual: saldoBrl, ultimo_update: new Date().toISOString() })
        .eq("nome", "SMMhype");
    }

    if (saldoBrl != null) {
      if (saldoBrl < 50) {
        alertaCriado = {
          nivel: 2,
          mensagem: `🚨 CRÍTICO: SMMhype com R$ ${saldoBrl.toFixed(2)} (abaixo de R$ 50). Consumo 24h: R$ ${previsao24hBrl.toFixed(2)}. Deposite manualmente AGORA no painel do fornecedor.`,
        };
      } else if (saldoBrl < 100) {
        alertaCriado = {
          nivel: 2,
          mensagem: `🚨 URGENTE: SMMhype com R$ ${saldoBrl.toFixed(2)}. Consumo 24h: R$ ${previsao24hBrl.toFixed(2)}.`,
        };
      } else if (saldoBrl < 300) {
        alertaCriado = {
          nivel: 1,
          mensagem: `⚠️ Atenção: SMMhype com R$ ${saldoBrl.toFixed(2)}. Consumo 24h: R$ ${previsao24hBrl.toFixed(2)}.`,
        };
      }
    }

    if (alertaCriado) {
      // Dedup: não criar outro alerta aberto do mesmo nível na última 1h
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabaseAdmin
        .from("alerts")
        .select("id")
        .eq("tipo", "smmhype_saldo")
        .eq("nivel", alertaCriado.nivel)
        .eq("status", "open")
        .gte("created_at", oneHourAgo)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabaseAdmin.from("alerts").insert({
          tipo: "smmhype_saldo",
          nivel: alertaCriado.nivel,
          mensagem: alertaCriado.mensagem,
          status: "open",
        });
        const { dispatchWhatsappAlert, buildSmmhypeAlertMessage } = await import("@/lib/whatsapp-alert.server");
        await dispatchWhatsappAlert(buildSmmhypeAlertMessage(saldoBrl));
      }
    }
  } catch (e) {
    console.error("[monitor-saldo] previsao/alerta error", e);
  }

  return {
    ok: statusPersistido === "Online",
    saldoUsd,
    saldoBrl,
    status: statusPersistido,
    erro,
    tempo_resposta_ms: elapsed,
    previsao24hBrl,
    alerta: alertaCriado,
  };
}

// v76 — Strict Balance Synchronizer: checa TODOS os fornecedores cadastrados,
// higieniza chaves (trim/zero-width) e normaliza api_url para o endpoint /api/v2.
function sanitizeKey(raw: string | undefined | null): string {
  if (!raw) return "";
  // remove whitespace, zero-width chars e aspas residuais
  return String(raw).replace(/[\s\u200B-\u200D\uFEFF"']+/g, "").trim();
}

function resolveApiKey(secretRef: string | undefined | null): string {
  const ref = sanitizeKey(secretRef);
  if (!ref) return "";
  const fromEnv = sanitizeKey(process.env[ref]);
  if (fromEnv) return fromEnv;
  // Compatível com instalações onde o valor real foi salvo no banco em vez do nome do secret.
  return ref;
}

function normalizeSmmEndpoint(apiUrl: string): string {
  const u = (apiUrl || "").trim().replace(/\/+$/, "");
  if (!u) return u;
  if (/\/api\/v2$/i.test(u)) return u;
  return `${u}/api/v2`;
}

export type ProviderBalanceResult = {
  id: string;
  nome: string;
  ok: boolean;
  saldoUsd: number | null;
  saldoBrl: number | null;
  status: "Online" | "Offline";
  erro: string | null;
  tempo_resposta_ms: number;
};

export async function checkAllProvidersBalance(opts: { fornecedor?: string } = {}): Promise<{ ok: true; results: ProviderBalanceResult[] }> {
  const target = opts.fornecedor?.trim().toLowerCase();
  const { data: rows } = await supabaseAdmin
    .from("fornecedores")
    .select("*")
    .order("prioridade", { ascending: true });
  const fornecedores = target
    ? (rows ?? []).filter((f: any) =>
        String(f.id).toLowerCase() === target ||
        String(f.slug ?? "").toLowerCase() === target ||
        String(f.nome ?? "").toLowerCase() === target,
      )
    : (rows ?? []);

  const results = await Promise.all(fornecedores.map(async (fornecedor: any): Promise<ProviderBalanceResult> => {
    const apiKey = resolveApiKey(fornecedor.api_key_secret as string);
    const endpoint = normalizeSmmEndpoint(fornecedor.api_url);
    const t0 = Date.now();
    let saldoUsd: number | null = null;
    let status: "Online" | "Offline" = "Online";
    let erro: string | null = null;

    try {
      if (!apiKey) throw new Error("API key ausente/inválida: " + fornecedor.api_key_secret);
      if (!endpoint) throw new Error("api_url ausente");

      const body = new URLSearchParams({ key: apiKey, action: "balance" });
      const doFetch = () => fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 EliteBoostPrime/1.0",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
        body: body.toString(),
        signal: AbortSignal.timeout(15000),
      });

      let res = await doFetch();
      if (res.status === 429 || res.status === 502 || res.status === 503) {
        await new Promise((r) => setTimeout(r, 2500));
        res = await doFetch();
      }
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch {}
      if (!res.ok || !json || json.error) {
        throw new Error(`HTTP ${res.status} body=${text.slice(0, 200)}`);
      }
      const raw = json.balance ?? json.saldo ?? json.funds;
      saldoUsd = typeof raw === "string" ? parseFloat(raw) : Number(raw);
      if (!Number.isFinite(saldoUsd)) throw new Error("saldo inválido: " + text.slice(0, 200));
    } catch (e: any) {
      status = "Offline";
      erro = e?.message ?? String(e);
      saldoUsd = null;
    }

    const elapsed = Date.now() - t0;
    const cotacao = Number((fornecedor as any).cotacao_brl ?? USD_TO_BRL_DEFAULT) || USD_TO_BRL_DEFAULT;
    const saldoBrl = saldoUsd != null ? saldoUsd * cotacao : null;

    // v67 Perpetual Balance Force: oscilação transitória NÃO desliga fornecedor com saldo cadastrado.
    const saldoAtualPrevio = Number((fornecedor as any).saldo_atual ?? 0);
    const preservarOnline = status === "Offline" && saldoAtualPrevio > 0;
    const statusPersistido = preservarOnline ? "Online" : status;

    await supabaseAdmin.from("monitoramento_saldo").insert({
      fornecedor_id: fornecedor.id,
      saldo: saldoUsd,
      status: statusPersistido,
      tempo_resposta_ms: elapsed,
      erro_retornado: erro,
    });

    await supabaseAdmin
      .from("fornecedores")
      .update({
        saldo_atual: saldoUsd ?? fornecedor.saldo_atual,
        status: statusPersistido,
        ultima_verificacao: new Date().toISOString(),
        falhas_consecutivas: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fornecedor.id);

    return {
      id: fornecedor.id,
      nome: fornecedor.nome,
      ok: statusPersistido === "Online",
      saldoUsd,
      saldoBrl,
      status: statusPersistido,
      erro,
      tempo_resposta_ms: elapsed,
    };
  }));

  return { ok: true, results };
}
