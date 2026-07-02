// Backward-compatible facade. Real Telegram delivery lives in messaging.ts.
import { dispatchTelegramAlert, type InlineKeyboardButton } from "./messaging";

export function buildSmmhypeAlertMessage(saldoBrl: number | null): string {
  const valor = saldoBrl == null ? "indisponível" : `R$ ${saldoBrl.toFixed(2)}`;
  return `⚠️ Fornecedor SMMHype abaixo do limite. Saldo atual: ${valor}`;
}

export async function dispatchWhatsappAlert(
  message: string,
  options: { inlineKeyboard?: InlineKeyboardButton[][] } = {},
): Promise<{ ok: boolean; detail?: string }> {
  return dispatchTelegramAlert(message, options);
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
