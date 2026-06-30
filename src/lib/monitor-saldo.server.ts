// Server-only: strict balance extraction for all SMM suppliers.
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

  const balance = await checkProviderBalance(fornecedor);
  await persistProviderBalance(fornecedor, balance);

  const { saldoUsd, saldoBrl, statusPersistido, erro, elapsed } = balance;

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
  const u = sanitizeEndpoint(apiUrl);
  if (!u) return u;
  if (/\/api\/v2$/i.test(u)) return u;
  return `${u}/api/v2`;
}

function sanitizeEndpoint(raw: string | undefined | null): string {
  if (!raw) return "";
  return String(raw).replace(/[\u200B-\u200D\uFEFF"']/g, "").trim().replace(/\/+$/, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildBalanceHeaders(): HeadersInit {
  return {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "EliteBoostPrime-JARVIS-NOC/78.0",
    "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}

function parseProviderBalance(text: string): number {
  let payload: any = null;
  try { payload = JSON.parse(text); } catch {}

  const raw =
    payload?.balance ??
    payload?.saldo ??
    payload?.funds ??
    payload?.data?.balance ??
    payload?.data?.saldo ??
    (payload == null && /^\s*-?\d+(?:[.,]\d+)?\s*$/.test(text) ? text : undefined);

  const normalized = typeof raw === "string"
    ? Number(raw.replace(/[^\d,.-]/g, "").replace(/,/g, "."))
    : Number(raw);

  if (!Number.isFinite(normalized)) {
    const providerError = payload?.error ?? payload?.message ?? payload?.msg;
    throw new Error(providerError ? `saldo indisponível: ${String(providerError).slice(0, 180)}` : `saldo inválido: ${text.slice(0, 180)}`);
  }
  return normalized;
}

async function fetchProviderBalance(endpoint: string, apiKey: string): Promise<number> {
  const url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}_noc=${Date.now()}`;
  const body = new URLSearchParams({ key: apiKey, action: "balance" });
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: buildBalanceHeaders(),
        body: body.toString(),
        signal: AbortSignal.timeout(18_000),
      });
      const text = await res.text();
      if (!res.ok) {
        const waitHeader = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(waitHeader) && waitHeader > 0 ? waitHeader * 1000 : 1800 + attempt * 1400;
        lastError = new Error(`HTTP ${res.status}: ${text.slice(0, 180)}`);
        if ([408, 425, 429, 500, 502, 503, 504].includes(res.status) && attempt < 2) {
          await sleep(waitMs);
          continue;
        }
        throw lastError;
      }
      return parseProviderBalance(text);
    } catch (e: any) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < 2) {
        await sleep(1600 + attempt * 1400);
        continue;
      }
    }
  }

  throw lastError ?? new Error("falha desconhecida na leitura de saldo");
}

// v79 — Strict Currency Conversion Pipeline.
// Cotação USD→BRL viva (AwesomeAPI · ExchangeRate-API · fallback default).
let _fxCache: { rate: number; at: number } | null = null;
const FX_TTL_MS = 5 * 60 * 1000;

export async function fetchUsdBrlRate(): Promise<number> {
  const now = Date.now();
  if (_fxCache && now - _fxCache.at < FX_TTL_MS) return _fxCache.rate;
  const sources = [
    { url: "https://economia.awesomeapi.com.br/json/last/USD-BRL", pick: (j: any) => Number(j?.USDBRL?.bid) },
    { url: "https://open.er-api.com/v6/latest/USD", pick: (j: any) => Number(j?.rates?.BRL) },
  ];
  for (const s of sources) {
    try {
      const r = await fetch(`${s.url}${s.url.includes("?") ? "&" : "?"}_=${now}`, {
        headers: { "Cache-Control": "no-cache" },
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) continue;
      const j = await r.json();
      const rate = s.pick(j);
      if (Number.isFinite(rate) && rate > 0) {
        _fxCache = { rate: Number(rate.toFixed(4)), at: now };
        return _fxCache.rate;
      }
    } catch { /* try next */ }
  }
  return USD_TO_BRL_DEFAULT;
}

type ProviderCheck = {
  saldoUsd: number | null;
  saldoBrl: number | null;
  cotacao: number;
  status: "Online" | "Offline";
  statusPersistido: "Online" | "Offline";
  erro: string | null;
  elapsed: number;
};

async function checkProviderBalance(fornecedor: any, fxRate?: number): Promise<ProviderCheck> {
  const t0 = Date.now();
  const apiKey = resolveApiKey(fornecedor.api_key_secret as string);
  const endpoint = normalizeSmmEndpoint(fornecedor.api_url as string);
  let saldoUsd: number | null = null;
  let status: "Online" | "Offline" = "Online";
  let erro: string | null = null;

  try {
    if (!apiKey) throw new Error("API key ausente/inválida");
    if (!endpoint) throw new Error("api_url ausente/inválida");
    const raw = await fetchProviderBalance(endpoint, apiKey);
    saldoUsd = Number(parseFloat(String(raw)).toFixed(2));
  } catch (e: any) {
    status = "Offline";
    erro = String(e?.message ?? e).slice(0, 240);
  }

  const elapsed = Date.now() - t0;
  const cotacao = Number(fxRate) > 0 ? Number(fxRate) : await fetchUsdBrlRate();
  const saldoBrl = saldoUsd != null ? Number((saldoUsd * cotacao).toFixed(2)) : null;
  const saldoAtualPrevio = Number((fornecedor as any).saldo_atual ?? 0);
  const statusPersistido = status === "Offline" && saldoAtualPrevio > 0 ? "Online" : status;

  return { saldoUsd, saldoBrl, cotacao, status, statusPersistido, erro, elapsed };
}

async function persistProviderBalance(fornecedor: any, balance: ProviderCheck) {
  await supabaseAdmin.from("monitoramento_saldo").insert({
    fornecedor_id: fornecedor.id,
    saldo: balance.saldoUsd,
    status: balance.statusPersistido,
    tempo_resposta_ms: balance.elapsed,
    erro_retornado: balance.erro,
  });

  // v79 — persiste saldo_atual em BRL (unificação contábil) + cotação viva.
  await supabaseAdmin
    .from("fornecedores")
    .update({
      saldo_atual: balance.saldoBrl ?? fornecedor.saldo_atual,
      cotacao_brl: balance.cotacao,
      status: balance.statusPersistido,
      ultima_verificacao: new Date().toISOString(),
      falhas_consecutivas: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fornecedor.id);
}

export type ProviderBalanceResult = {
  id: string;
  nome: string;
  slug: string | null;
  ok: boolean;
  saldoUsd: number | null;
  saldoBrl: number | null;
  cotacao: number;
  saldoPersistidoBrl: number | null;
  /** @deprecated use saldoPersistidoBrl */
  saldoPersistidoUsd: number | null;
  status: "Online" | "Offline";
  erro: string | null;
  tempo_resposta_ms: number;
};

export async function checkAllProvidersBalance(opts: { fornecedor?: string } = {}): Promise<{ ok: true; cotacao: number; results: ProviderBalanceResult[] }> {
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

  const fxRate = await fetchUsdBrlRate();

  const results = await Promise.all(fornecedores.map(async (fornecedor: any): Promise<ProviderBalanceResult> => {
    const balance = await checkProviderBalance(fornecedor, fxRate);
    await persistProviderBalance(fornecedor, balance);

    const persistidoBrl = balance.saldoBrl ?? (fornecedor.saldo_atual != null ? Number(fornecedor.saldo_atual) : null);
    return {
      id: fornecedor.id,
      nome: fornecedor.nome,
      slug: fornecedor.slug ?? null,
      ok: balance.statusPersistido === "Online",
      saldoUsd: balance.saldoUsd,
      saldoBrl: balance.saldoBrl,
      cotacao: balance.cotacao,
      saldoPersistidoBrl: persistidoBrl,
      saldoPersistidoUsd: balance.saldoUsd,
      status: balance.statusPersistido,
      erro: balance.erro,
      tempo_resposta_ms: balance.elapsed,
    };
  }));

  return { ok: true, cotacao: fxRate, results };
}
