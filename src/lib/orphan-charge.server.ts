// v259 — Cobrança órfã: MP criou o pagamento mas o pedido não entrou no banco.
// Antes só o caminho de `error` do insert estornava. Se o banco caísse (timeout /
// exceção), caíamos no catch genérico e ninguém era avisado: pagamento existia no
// Mercado Pago sem nenhum pedido correspondente. Agora os dois caminhos passam aqui.

export async function refundOrphanCharge(
  mpId: string | null,
  valor: number,
  email: string,
  motivo: string,
): Promise<void> {
  try {
    const { refundMercadoPago } = await import("./dispatcher-fallback.server");
    const r = mpId ? await refundMercadoPago(mpId) : { ok: false, detail: "no mpId" };
    const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
    await dispatchWhatsappAlert(
      `🚨 COBRANÇA SEM PEDIDO NO BANCO\n\n` +
        `PROBLEMA: o Mercado Pago criou uma cobrança de R$${valor.toFixed(2)} do cliente ${email} ` +
        `mas o pedido não foi salvo no banco (${motivo}). Estorno automático: ${r.ok ? "OK" : "FALHOU"}` +
        `${r.ok ? "" : ` — ${r.detail}`}.\nID do pagamento: ${mpId ?? "desconhecido"}\n\n` +
        `O QUE FAZER: ${r.ok ? "só confirmar no Mercado Pago se o estorno aparece." : `abrir o Mercado Pago MANUALMENTE e estornar o pagamento ${mpId} AGORA.`}`,
    ).catch(() => {});
  } catch (e) {
    console.error("[orphan-charge] falha no estorno automático:", e);
  }
}
