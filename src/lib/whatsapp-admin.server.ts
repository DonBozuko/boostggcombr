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

async function sendViaTwilio(text: string): Promise<{ ok: boolean; detail?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.WHATSAPP_API_TOKEN || process.env.TWILIO_API_KEY;
  const to = process.env.ADMIN_WHATSAPP_NUMBER; // ex: whatsapp:+5511999999999
  const from = process.env.TWILIO_WHATSAPP_FROM; // ex: whatsapp:+14155238886
  if (!lovableKey || !twilioKey || !to || !from) {
    console.warn("[whatsapp-admin] ⚠️ Credenciais ausentes. Configure em Lovable → Project Settings → Environment Variables:\n  • ADMIN_WHATSAPP_NUMBER = whatsapp:+55DDDNUMERO (ex: whatsapp:+5511999998888)\n  • WHATSAPP_API_TOKEN    = token Twilio da Ponte v119\n  • TWILIO_WHATSAPP_FROM  = whatsapp:+14155238886 (sandbox ou aprovado)");
    return { ok: false, detail: "WHATSAPP_ENV_MISSING" };
  }
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
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      return { ok: false, detail: `HTTP ${res.status}: ${detail}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? String(e) };
  }
}

/** Notifica o admin sobre um pedido em waiting_provision. Não lança. */
export async function notifyAdminProvisioning(alert: ProvisioningAlert): Promise<void> {
  const text = buildProvisioningMessage(alert);
  try {
    const wa = await sendViaTwilio(text);
    if (wa.ok) return;
    console.warn("[whatsapp-admin] fallback telegram", wa.detail);
    await dispatchTelegramFallback(text).catch(() => {});
  } catch (e) {
    console.warn("[whatsapp-admin] notifyAdminProvisioning falhou", e);
  }
}
