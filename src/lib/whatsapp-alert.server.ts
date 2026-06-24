// Server-only: dispatch alert messages to our own WhatsApp Business number.
// Configurable via env. Right now it logs + (optionally) posts to a webhook
// if WHATSAPP_ALERT_WEBHOOK is set. Easy to swap for the official Cloud API.

export const ADMIN_WHATSAPP_NUMBER = process.env.ADMIN_WHATSAPP_NUMBER ?? "5500000000000";

export function buildSmmhypeAlertMessage(saldoBrl: number | null): string {
  const valor = saldoBrl == null ? "indisponível" : `R$ ${saldoBrl.toFixed(2)}`;
  return `⚠️ Fornecedor SMMHype abaixo do limite. Saldo atual: ${valor}`;
}

export async function dispatchWhatsappAlert(message: string): Promise<{ ok: boolean; detail?: string }> {
  // Always log so the admin pode auditar nos logs do servidor.
  console.warn("[whatsapp-alert]", { to: ADMIN_WHATSAPP_NUMBER, message });

  const webhook = process.env.WHATSAPP_ALERT_WEBHOOK;
  if (!webhook) {
    return { ok: false, detail: "WHATSAPP_ALERT_WEBHOOK_NOT_CONFIGURED" };
  }
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: ADMIN_WHATSAPP_NUMBER, message }),
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? String(e) };
  }
}
