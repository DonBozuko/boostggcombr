// Server-only: dispatch alerts to our own WhatsApp Business via Meta Cloud API.
// Secrets required: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, ADMIN_WHATSAPP_NUMBER.

const GRAPH_VERSION = "v21.0";

export function buildSmmhypeAlertMessage(saldoBrl: number | null): string {
  const valor = saldoBrl == null ? "indisponível" : `R$ ${saldoBrl.toFixed(2)}`;
  return `⚠️ Fornecedor SMMHype abaixo do limite. Saldo atual: ${valor}`;
}

export async function dispatchWhatsappAlert(message: string): Promise<{ ok: boolean; detail?: string }> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = process.env.ADMIN_WHATSAPP_NUMBER;

  console.warn("[whatsapp-alert]", { to: to ?? "MISSING", message });

  if (!token || !phoneId || !to) {
    return { ok: false, detail: "WHATSAPP_ENV_MISSING" };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[whatsapp-alert] HTTP", res.status, text.slice(0, 300));
      return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? String(e) };
  }
}
