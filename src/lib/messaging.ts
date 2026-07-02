// v156-core — Telegram Enforcer
// Server-only call path. Reads secrets lazily inside functions.

export type InlineKeyboardButton = { text: string; url?: string; callback_data?: string };

const TELEGRAM_GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function clean(v: string | undefined): string | null {
  const s = v?.trim();
  return s ? s : null;
}

function getAdminTelegramChatId(): string | null {
  return (
    clean(process.env.ADMIN_TELEGRAM_CHAT_ID) ??
    clean(process.env.ID_DO_CHAT_DO_ADMINISTRADOR_DO_TELEGRAM) ??
    clean(process.env.TELEGRAM_ADMIN_CHAT_ID) ??
    null
  );
}

function getTelegramBotToken(): string | null {
  const direct = clean(process.env.TELEGRAM_BOT_TOKEN);
  const legacy = clean(process.env.WHATSAPP_API_TOKEN);
  const token = direct ?? legacy;
  // Telegram bot tokens are normally "123456:ABC...". Avoid sending non-Telegram legacy tokens to Telegram.
  return token && /^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token) ? token : null;
}

function getConnectorTelegramKey(): string | null {
  return clean(process.env.TELEGRAM_API_KEY);
}

function getLovableKey(): string | null {
  return clean(process.env.LOVABLE_API_KEY);
}

function buildBody(message: string, options: { inlineKeyboard?: InlineKeyboardButton[][] }) {
  const body: Record<string, unknown> = {
    chat_id: getAdminTelegramChatId(),
    text: message,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (options.inlineKeyboard?.length) body.reply_markup = { inline_keyboard: options.inlineKeyboard };
  return body;
}

async function sendViaConnector(message: string, options: { inlineKeyboard?: InlineKeyboardButton[][] }) {
  const lovableKey = getLovableKey();
  const connectorKey = getConnectorTelegramKey();
  const chatId = getAdminTelegramChatId();
  if (!lovableKey || !connectorKey || !chatId) return { ok: false, detail: "TELEGRAM_CONNECTOR_ENV_MISSING" };

  const res = await fetch(`${TELEGRAM_GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectorKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildBody(message, options)),
  });
  const text = await res.text();
  return res.ok
    ? { ok: true }
    : { ok: false, detail: `CONNECTOR HTTP ${res.status}: ${text.slice(0, 300)}` };
}

async function sendViaDirectBot(message: string, options: { inlineKeyboard?: InlineKeyboardButton[][] }) {
  const botToken = getTelegramBotToken();
  const chatId = getAdminTelegramChatId();
  if (!botToken || !chatId) return { ok: false, detail: "TELEGRAM_DIRECT_ENV_MISSING" };

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildBody(message, options)),
  });
  const text = await res.text();
  return res.ok
    ? { ok: true }
    : { ok: false, detail: `DIRECT HTTP ${res.status}: ${text.slice(0, 300)}` };
}

export async function dispatchTelegramAlert(
  message: string,
  options: { inlineKeyboard?: InlineKeyboardButton[][] } = {},
): Promise<{ ok: boolean; detail?: string }> {
  try {
    const viaConnector = await sendViaConnector(message, options);
    if (viaConnector.ok) return viaConnector;

    const viaDirect = await sendViaDirectBot(message, options);
    if (viaDirect.ok) return viaDirect;

    return { ok: false, detail: `${viaConnector.detail} | ${viaDirect.detail}` };
  } catch (e: any) {
    return { ok: false, detail: e?.message ?? String(e) };
  }
}

export function getTelegramEnvironmentStatus() {
  return {
    chatId: Boolean(getAdminTelegramChatId()),
    connector: Boolean(getLovableKey() && getConnectorTelegramKey()),
    directBot: Boolean(getTelegramBotToken()),
  };
}