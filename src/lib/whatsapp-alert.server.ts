// Server-only: dispatch alerts via Telegram (Lovable connector gateway).
// Secrets: LOVABLE_API_KEY + TELEGRAM_API_KEY (auto), ADMIN_TELEGRAM_CHAT_ID (user-provided).
// Name kept for backward compatibility with existing call sites.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

export function buildSmmhypeAlertMessage(saldoBrl: number | null): string {
  const valor = saldoBrl == null ? "indisponível" : `R$ ${saldoBrl.toFixed(2)}`;
  return `⚠️ Fornecedor SMMHype abaixo do limite. Saldo atual: ${valor}`;
}

export type InlineKeyboardButton = { text: string; url?: string; callback_data?: string };

export async function dispatchWhatsappAlert(
  message: string,
  options: { inlineKeyboard?: InlineKeyboardButton[][] } = {},
): Promise<{ ok: boolean; detail?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const tgKey = process.env.TELEGRAM_API_KEY;
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;

  console.warn("[telegram-alert]", { chatId: chatId ?? "MISSING", message });

  if (!lovableKey || !tgKey || !chatId) {
    return { ok: false, detail: "TELEGRAM_ENV_MISSING" };
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (options.inlineKeyboard?.length) {
    body.reply_markup = { inline_keyboard: options.inlineKeyboard };
  }

  try {
    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

// Copy oficial de recuperação (mantida em sincronia com o /admin)
export function buildRecoveryWhatsappText(): string {
  return (
    "Olá! Identificamos uma instabilidade temporária no nosso checkout de Pix " +
    "enquanto você finalizava o seu pedido na EliteBoost Prime. Pedimos sinceras " +
    "desculpas pelo inconveniente! 🙏 Para garantir que você não perca os seus " +
    "bônus de crescimento de algoritmo, geramos um link de contingência direto e " +
    "seguro. Basta clicar para finalizar com ativação imediata: https://t.me"
  );
}

export function buildRecoveryWhatsappUrl(phone?: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(buildRecoveryWhatsappText());
  return digits
    ? `https://api.whatsapp.com/send?phone=${digits}&text=${text}`
    : `https://api.whatsapp.com/send?text=${text}`;
}
