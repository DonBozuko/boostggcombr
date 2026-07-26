// v273 — Aviso automático de estorno por e-mail.
// Antes só o SLA-watcher e o refund manual avisavam. O estorno automático da
// contingência (falha em todos fornecedores) deixava o cliente no escuro.
// Este helper centraliza o envio para não duplicar regra.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isRealCustomerEmail(raw: unknown): boolean {
  const email = String(raw ?? "").toLowerCase().trim();
  if (!email || !EMAIL_RE.test(email)) return false;
  if (email.includes("anonimizado")) return false;
  if (email.endsWith("@webhook")) return false;
  // fallback sintético do checkout (cliente@<rede>.eliteboostprime.com)
  if (email.endsWith(".eliteboostprime.com")) return false;
  return true;
}

export async function sendRefundNoticeEmail(pedido: {
  id: string;
  email_contato?: unknown;
  pacote?: unknown;
  valor?: unknown;
}): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const email = String(pedido.email_contato ?? "").toLowerCase().trim();
  if (!isRealCustomerEmail(email)) return { ok: false, skipped: "email_invalido" };

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("enqueue_email" as any, {
      queue_name: "transactional_emails",
      payload: {
        template_name: "refund-notice",
        recipient_email: email,
        idempotency_key: `refund-notice-${pedido.id}`,
        template_data: {
          pacote: pedido.pacote ?? null,
          valor: Number(pedido.valor ?? 0).toFixed(2).replace(".", ","),
          pedidoId: String(pedido.id).slice(0, 8),
        },
      },
    } as any);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "unknown" };
  }
}
