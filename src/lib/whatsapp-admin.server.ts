// v119 — Strict WhatsApp Provisioning Bridge
// Dispara alerta ao WhatsApp do Diretor quando um Pix é pago mas o pedido
// entra em `waiting_provision` (fornecedor sem saldo/ID). Fallback: Telegram.
// Preserva HUD v57, v101, v107, v115 (read-only server-only).

import { dispatchWhatsappAlert as dispatchTelegramFallback } from "./whatsapp-alert.server";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

export type ProvisioningAlert = {
  pedidoId: string;
  vendaBrl: number;
  custoBrl?: number | null;
  fornecedor?: string | null;
  motivo?: string | null;
};

function fmtBrl(v: number): string {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

/** Estima o custo bruto a partir do preço de venda quando não temos rate. */
function estimateCost(vendaBrl: number): number {
  // preço = custo * 4.0 * 1.15 / 0.9901  →  custo ≈ preço * 0.9901 / 4.6
  return Number(((vendaBrl * 0.9901) / (4.0 * 1.15)).toFixed(2));
}

export function buildProvisioningMessage(a: ProvisioningAlert): string {
  const custo = a.custoBrl && a.custoBrl > 0 ? a.custoBrl : estimateCost(a.vendaBrl);
  const lucroLiquido = Number((a.vendaBrl * 0.9901 - custo * 1.15).toFixed(2));
  const pix = process.env.PROVIDER_PIX_COPIA_COLA?.trim() || null;
  const linhas = [
    "🟡 *v119 · Provisão Necessária*",
    `Pedido: *${a.pedidoId}*`,
    a.fornecedor ? `Fornecedor: *${a.fornecedor}*` : null,
    `Venda: ${fmtBrl(a.vendaBrl)}`,
    `Custo p/ depósito: *${fmtBrl(custo)}*`,
    `Lucro líquido garantido (≈300%): ${fmtBrl(lucroLiquido)}`,
    a.motivo ? `Motivo: ${a.motivo}` : null,
  ].filter(Boolean);
  const base = linhas.join("\n");
  return pix ? `${base}\n\nPix Copia e Cola (recarga fornecedor):\n${pix}` : base;
}

// v148 — normaliza destino: garante prefixo "whatsapp:+55" e gera fallback sem o 9º dígito
function normalizeAdminNumbers(raw: string): string[] {
  let s = raw.trim().replace(/\s+/g, "");
  if (!s.startsWith("whatsapp:")) {
    const digits = s.replace(/\D/g, "");
    const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
    s = `whatsapp:+${withCountry}`;
  }
  const out = [s];
  // Fallback sem 9º dígito: whatsapp:+55 DDD 9XXXXXXXX -> whatsapp:+55 DDD XXXXXXXX
  const m = s.match(/^whatsapp:\+55(\d{2})9(\d{8})$/);
  if (m) out.push(`whatsapp:+55${m[1]}${m[2]}`);
  return out;
}

type TwilioAttempt = { to: string; status?: number; code?: number | string; message?: string; moreInfo?: string; ok: boolean };
type TwilioResult = { ok: boolean; attempts: TwilioAttempt[]; reason?: string };

async function sendViaTwilio(text: string): Promise<TwilioResult> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.WHATSAPP_API_TOKEN || process.env.TWILIO_API_KEY;
  const rawTo = process.env.ADMIN_WHATSAPP_NUMBER;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!lovableKey || !twilioKey || !rawTo || !from) {
    const missing = [
      !lovableKey && "LOVABLE_API_KEY",
      !twilioKey && "WHATSAPP_API_TOKEN/TWILIO_API_KEY",
      !rawTo && "ADMIN_WHATSAPP_NUMBER",
      !from && "TWILIO_WHATSAPP_FROM",
    ].filter(Boolean).join(", ");
    console.warn("[whatsapp-admin] ⚠️ Credenciais ausentes:", missing);
    return { ok: false, attempts: [], reason: `WHATSAPP_ENV_MISSING: ${missing}` };
  }
  const targets = normalizeAdminNumbers(rawTo);
  const attempts: TwilioAttempt[] = [];
  for (const to of targets) {
    try {
      const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": twilioKey,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: text }),
      });
      const raw = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { /* ignore */ }
      if (res.ok) {
        attempts.push({ to, status: res.status, ok: true });
        return { ok: true, attempts };
      }
      const att: TwilioAttempt = {
        to,
        ok: false,
        status: res.status,
        code: parsed?.code ?? parsed?.error?.code,
        message: parsed?.message ?? parsed?.error?.message ?? raw.slice(0, 240),
        moreInfo: parsed?.more_info ?? parsed?.error?.more_info,
      };
      attempts.push(att);
      console.warn("[whatsapp-admin] Twilio erro", att);
    } catch (e: any) {
      attempts.push({ to, ok: false, message: e?.message ?? String(e) });
    }
  }
  return { ok: false, attempts };
}

function summarizeAttempts(r: TwilioResult): string {
  if (r.reason) return r.reason;
  return r.attempts.map((a) =>
    `${a.to} → HTTP ${a.status ?? "?"} code=${a.code ?? "?"} · ${(a.message ?? "").slice(0, 160)}`
  ).join(" | ");
}

/** Notifica o admin sobre um pedido em waiting_provision. Não lança. */
export async function notifyAdminProvisioning(alert: ProvisioningAlert): Promise<void> {
  const text = buildProvisioningMessage(alert);
  try {
    const wa = await sendViaTwilio(text);
    if (wa.ok) return;
    const detail = summarizeAttempts(wa);
    console.error("[whatsapp-admin] ❌ Twilio falhou · v149", detail);
    // v149 — registra falha detalhada para o LiveTelemetryMonitor no /admin
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        action: "WHATSAPP_SEND_FAILED",
        detail: {
          pedido_id: alert.pedidoId,
          reason: wa.reason ?? "twilio_error",
          attempts: wa.attempts,
          summary: detail,
        },
      } as any);
    } catch (logErr) {
      console.warn("[whatsapp-admin] audit-log insert falhou", logErr);
    }
    await dispatchTelegramFallback(`${text}\n\n[v149 Twilio erro] ${detail}`).catch(() => {});
  } catch (e) {
    console.warn("[whatsapp-admin] notifyAdminProvisioning falhou", e);
  }
}
