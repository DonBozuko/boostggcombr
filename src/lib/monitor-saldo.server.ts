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
    const res = await fetch(fornecedor.api_url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
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

  // Failure threshold
  const novasFalhas = status === "Offline" ? (fornecedor.falhas_consecutivas ?? 0) + 1 : 0;
  const statusPersistido = status === "Offline" && novasFalhas < 3 ? fornecedor.status : status;

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

  return {
    ok: status === "Online",
    saldoUsd,
    saldoBrl: saldoUsd != null ? saldoUsd * USD_TO_BRL : null,
    status: statusPersistido,
    erro,
    tempo_resposta_ms: elapsed,
  };
}
