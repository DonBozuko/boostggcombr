// Server-only: check SMMhype balance and persist into monitoramento_saldo.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const USD_TO_BRL = 5.6;

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

  const apiKey = process.env[fornecedor.api_key_secret as string];
  const t0 = Date.now();
  let saldoUsd: number | null = null;
  let status = "Online";
  let erro: string | null = null;

  try {
    if (!apiKey) throw new Error("API key ausente: " + fornecedor.api_key_secret);
    const body = new URLSearchParams({ key: apiKey, action: "balance" });

    const doFetch = () => fetch(fornecedor.api_url, {
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
  const statusPersistido = status;


  await supabaseAdmin.from("monitoramento_saldo").insert({
    fornecedor_id: fornecedor.id,
    saldo: saldoUsd,
    status,
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

  const saldoBrl = saldoUsd != null ? saldoUsd * USD_TO_BRL : null;

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
      if (saldoBrl < 100) {
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
    ok: status === "Online",
    saldoUsd,
    saldoBrl,
    status: statusPersistido,
    erro,
    tempo_resposta_ms: elapsed,
    previsao24hBrl,
    alerta: alertaCriado,
  };
}
