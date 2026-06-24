// Server-only: dispatch alerts via Telegram (Lovable connector gateway).
// Secrets: LOVABLE_API_KEY + TELEGRAM_API_KEY (auto), ADMIN_TELEGRAM_CHAT_ID (user-provided).
// Name kept for backward compatibility with existing call sites.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export function buildSmmhypeAlertMessage(saldoBrl: number | null): string {
  const valor = saldoBrl == null ? "indisponível" : `R$ ${saldoBrl.toFixed(2)}`;
  return `⚠️ Fornecedor SMMHype abaixo do limite. Saldo atual: ${valor}`;
}

export async function dispatchWhatsappAlert(message: string): Promise<{ ok: boolean; detail?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;

  console.warn("[telegram-alert]", { chatId: chatId ?? "MISSING", message });

  if (!lovableKey || !tgKey || !chatId) {
    return { ok: false, detail: "TELEGRAM_ENV_MISSING" };
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("[telegram-alert] HTTP", res.status, text.slice(0, 300));
      return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? String(e) };
  }
}
