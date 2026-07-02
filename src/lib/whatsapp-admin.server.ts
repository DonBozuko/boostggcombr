// v151 — Strict Telegram Admin Matrix
// Canal PRIMÁRIO: Telegram (Lovable connector gateway). Twilio desativado.
// Entrega Pix Copia-e-Cola específico do fornecedor + botão inline "✅ Recarga Confirmada".
// Preserva HUD v57, v101, v107, v115 (read-only server-only).

import { dispatchWhatsappAlert as dispatchTelegram, type InlineKeyboardButton } from "./whatsapp-alert.server";

export type ProvisioningAlert = {
  pedidoId: string;
  vendaBrl: number;
  custoBrl?: number | null;
  fornecedor?: string | null;
  motivo?: string | null;
  compradorHandle?: string | null;
  pacote?: string | null;
  quantidade?: number | null;
};

function fmtBrl(v: number): string {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}

/** Estima o custo bruto a partir do preço de venda quando não temos rate. */
function estimateCost(vendaBrl: number): number {
  // preço = custo * 4.0 * 1.15 / 0.9901
  return Number(((vendaBrl * 0.9901) / (4.0 * 1.15)).toFixed(2));
}

/** Retorna o Pix Copia-e-Cola do fornecedor alvo (ou null). */
export function pixForFornecedor(slug: string | null | undefined): string | null {
  const s = (slug ?? "").toLowerCase();
  if (s.includes("smmhype")) return process.env.SMMHYPE_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("smmpainel") || s.includes("smmpanel")) return process.env.SMMPANEL_PIX_COPIA_COLA?.trim() || null;
  if (s.includes("verified")) return process.env.VERIFIED_PIX_COPIA_COLA?.trim() || null;
  // fallback legado
  return process.env.PROVIDER_PIX_COPIA_COLA?.trim() || null;
}

export function buildProvisioningMessage(a: ProvisioningAlert): string {
  const custo = a.custoBrl && a.custoBrl > 0 ? a.custoBrl : estimateCost(a.vendaBrl);
  const lucroLiquido = Number((a.vendaBrl * 0.9901 - custo * 1.15).toFixed(2));
  const pix = pixForFornecedor(a.fornecedor);
  const linhas = [
    "🟡 <b>v151 · Provisão Necessária</b>",
    `Pedido: <code>${a.pedidoId}</code>`,
    a.compradorHandle ? `Comprador: <b>${a.compradorHandle}</b>` : null,
    a.pacote ? `Pacote: <b>${a.pacote}</b>${a.quantidade ? ` × ${a.quantidade}` : ""}` : null,
    a.fornecedor ? `Fornecedor: <b>${a.fornecedor}</b>` : null,
    `Venda: ${fmtBrl(a.vendaBrl)}`,
    `Custo depósito: <b>${fmtBrl(custo)}</b>`,
    `Lucro líq. (~300%): ${fmtBrl(lucroLiquido)}`,
    a.motivo ? `Motivo: ${a.motivo}` : null,
  ].filter(Boolean);
  const base = linhas.join("\n");
  return pix
    ? `${base}\n\n<b>Pix Copia e Cola (recarga fornecedor):</b>\n<code>${pix}</code>`
    : `${base}\n\n⚠️ <i>Pix Copia-e-Cola do fornecedor não configurado.</i>`;
}

/** Alerta universal: TODO pedido pago (com sucesso ou aguardando provisão). */
export type UniversalPaidAlert = {
  pedidoId: string;
  vendaBrl: number;
  compradorHandle: string | null;
  pacote: string | null;
  quantidade: number | null;
  fornecedor?: string | null;
};

export function buildUniversalPaidMessage(a: UniversalPaidAlert): string {
  // v156 — Modelo saldo pré-carregado: cliente paga → sistema debita saldo local
  // e entrega imediato. NÃO enviamos PIX por pedido. PIX de recarga só chega
  // no alerta de provisão (saldo baixo/zerado) via buildProvisioningMessage.
  const custoEstimado = estimateCost(a.vendaBrl);
  const lucroLiquido = Number((a.vendaBrl * 0.9901 - custoEstimado * 1.15).toFixed(2));
  const linhas = [
    "🟢 <b>PIX APROVADO · Entrega automática</b>",
    `Pedido: <code>${a.pedidoId}</code>`,
    a.compradorHandle ? `Comprador: <b>${a.compradorHandle}</b>` : null,
    a.pacote ? `Pacote: <b>${a.pacote}</b>${a.quantidade ? ` × ${a.quantidade}` : ""}` : null,
    `Venda: ${fmtBrl(a.vendaBrl)}`,
    `Custo estimado: ${fmtBrl(custoEstimado)}`,
    `Lucro líq. estimado: <b>${fmtBrl(lucroLiquido)}</b>`,
    a.fornecedor ? `Debitado de: <b>${a.fornecedor}</b>` : null,
  ].filter(Boolean);
  return linhas.join("\n");
}

function rechargeKeyboard(pedidoId: string): InlineKeyboardButton[][] {
  return [[{ text: "✅ Recarga Confirmada", callback_data: `recharge:${pedidoId}` }]];
}

/** Notifica o admin (Telegram primário). Não lança. */
export async function notifyAdminProvisioning(alert: ProvisioningAlert): Promise<void> {
  const text = buildProvisioningMessage(alert);
  try {
    const res = await dispatchTelegram(text, { inlineKeyboard: rechargeKeyboard(alert.pedidoId) });
    if (!res.ok) {
      console.error("[admin-notify] Telegram falhou", res.detail);
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("admin_audit_logs" as any).insert({
          action: "TELEGRAM_SEND_FAILED",
          detail: { pedido_id: alert.pedidoId, reason: res.detail ?? "unknown" },
        } as any);
      } catch (e) { console.warn("[admin-notify] audit fail", e); }
    }
  } catch (e) {
    console.warn("[admin-notify] notifyAdminProvisioning falhou", e);
  }
}

/** Alerta universal em TODO pedido pago (sem PIX, sem botão). Não lança. */
export async function notifyAdminUniversalPaid(alert: UniversalPaidAlert): Promise<void> {
  try {
    const res = await dispatchTelegram(buildUniversalPaidMessage(alert));
    if (!res.ok) console.error("[admin-notify] universal Telegram falhou", res.detail);
  } catch (e) {
    console.warn("[admin-notify] notifyAdminUniversalPaid falhou", e);
  }
}
