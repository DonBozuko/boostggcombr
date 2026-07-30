// v374 — Trilha forense de despacho.
// Toda requisição a fornecedor (SMMhype ou SMM v2 genérico) grava aqui:
// fornecedor, service id enviado, quantidade, link alvo, status HTTP e o corpo
// BRUTO da resposta SEM truncar (mesmo HTML/texto quebrado). Nunca lança:
// falha de log jamais pode derrubar um envio já pago.
export type DispatchLogInput = {
  provider_slug: string;
  pacote?: string | null;
  service_id?: string | number | null;
  quantidade?: number | null;
  target_link?: string | null;
  http_status?: number | null;
  raw_response?: string | null;
  ok: boolean;
  order_id?: string | number | null;
  error_text?: string | null;
  attempt?: number;
  pedido_id?: string | null;
};

export async function logDispatchAttempt(input: DispatchLogInput): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("dispatch_attempts_logs" as never).insert({
      provider_slug: input.provider_slug,
      pacote: input.pacote ?? null,
      service_id: input.service_id != null ? String(input.service_id) : null,
      quantidade: input.quantidade ?? null,
      target_link: input.target_link ?? null,
      http_status: input.http_status ?? null,
      // sem slice: o corpo bruto é a prova
      raw_response: input.raw_response ?? null,
      ok: input.ok,
      order_id: input.order_id != null ? String(input.order_id) : null,
      error_text: input.error_text ?? null,
      attempt: input.attempt ?? 1,
      pedido_id: input.pedido_id ?? null,
    } as never);
  } catch (e) {
    console.warn("[dispatch-log] falhou ao gravar trilha:", (e as Error).message);
  }
}
