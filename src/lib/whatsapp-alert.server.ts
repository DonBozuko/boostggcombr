// Backward-compatible facade. Real Telegram delivery lives in messaging.ts.
import { dispatchTelegramAlert, type InlineKeyboardButton } from "./messaging";

export type { InlineKeyboardButton };

export function buildSmmhypeAlertMessage(saldoBrl: number | null): string {
  const valor = saldoBrl == null ? "indisponível" : `R$ ${saldoBrl.toFixed(2)}`;
  return `⚠️ SALDO BAIXO NO FORNECEDOR\n\nPROBLEMA: fornecedor SMMHype está quase sem dinheiro.\nSaldo atual: ${valor}\n\nO QUE FAZER: recarregar antes que novos pedidos falhem.`;
}

export async function dispatchWhatsappAlert(
  message: string,
  // v311 — dá para marcar "a trava funcionou" como aviso. Sem isso todo alerta
  // entrava como crítico e o semáforo do admin ficava vermelho por proteção
  // que deu certo, escondendo o vermelho que é dinheiro/cliente em risco.
  options: { inlineKeyboard?: InlineKeyboardButton[][]; severity?: AlertSeverity } = {},
): Promise<{ ok: boolean; detail?: string }> {
  return dispatchTelegramAlert(message, options);
}

// Copy oficial de recuperação (mantida em sincronia com o /admin)
export function buildRecoveryWhatsappText(): string {
  return (
    "Olá! Identificamos uma instabilidade temporária no nosso checkout de Pix " +
    "enquanto você finalizava o seu pedido na BoostGG. Pedimos sinceras " +
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
