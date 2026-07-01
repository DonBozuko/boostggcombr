// Server-only: dispatcher genérico SMM Panel v2 (SMMPainel, Verified Atacado).
// Mesmo protocolo do SMMhype (key/action/service/link/quantity).
import { resolveServiceId, SMMHYPE_SERVICE_IDS, type SmmDispatchResult } from "./smmhype.server";

function normalizeLink(pacote: string, raw: string): string {
  const p = pacote.toLowerCase();
  const t = raw.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (p.startsWith("f")) {
    const h = t.replace(/^@+/, "").replace(/[/?#].*$/, "");
    return `https://www.facebook.com/${h}`;
  }
  if (p.startsWith("y")) return t;
  if (p.startsWith("t")) {
    const h = t.replace(/^@+/, "").replace(/[/?#].*$/, "");
    return p.startsWith("tf") ? `https://www.tiktok.com/@${h}` : t;
  }
  const h = t.replace(/^@+/, "").replace(/^instagram\.com\//i, "");
  return `https://instagram.com/${h}`;
}

export async function dispatchSmmV2(opts: {
  endpoint: string;
  apiKey: string | undefined;
  fornecedor: string;
  pacote: string;
  quantidade: number;
  instagram_user: string;
  serviceIdOverride?: string | number | null;
}): Promise<SmmDispatchResult> {
  if (!opts.apiKey) return { ok: false, error: `${opts.fornecedor}: API key ausente` };
  const serviceId =
    (opts.serviceIdOverride != null && String(opts.serviceIdOverride).trim() !== ""
      ? opts.serviceIdOverride
      : null) ??
    resolveServiceId(opts.pacote, opts.quantidade) ??
    SMMHYPE_SERVICE_IDS[opts.pacote.toLowerCase()];
  if (!serviceId) return { ok: false, error: `${opts.fornecedor}: service id ausente` };

  const body = new URLSearchParams({
    key: opts.apiKey,
    action: "add",
    service: String(serviceId),
    link: normalizeLink(opts.pacote, opts.instagram_user),
    quantity: String(opts.quantidade),
  });

  try {
    const res = await fetch(opts.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* */ }
    if (!res.ok || (json && (json as { error?: string }).error)) {
      return { ok: false, error: `${opts.fornecedor} falhou`, status: res.status, body: json ?? text };
    }
    const orderId = (json as { order?: string | number } | null)?.order;
    return { ok: true, orderId, body: json ?? text };
  } catch (err) {
    return { ok: false, error: `${opts.fornecedor}: rede ${(err as Error).message}` };
  }
}

export async function dispatchByFornecedor(slug: string, args: {
  pacote: string; quantidade: number; instagram_user: string;
  serviceIdOverride?: string | number | null;
}): Promise<SmmDispatchResult> {
  if (slug === "smmhype") {
    const { dispatchSmmhype } = await import("./smmhype.server");
    return dispatchSmmhype(args);
  }
  if (args.serviceIdOverride == null || String(args.serviceIdOverride).trim() === "") {
    return { ok: false, error: `${slug}: ID reserva real ausente no pricing_items` };
  }
  if (slug === "smmpainel") {
    return dispatchSmmV2({
      endpoint: "https://smmpainel.com/api/v2",
      apiKey: process.env.SMMPAINEL_API_KEY,
      fornecedor: "SMMPainel",
      ...args,
    });
  }
  if (slug === "verified") {
    return dispatchSmmV2({
      endpoint: "https://verifiedatacado.com/api/v2",
      apiKey: process.env.VERIFIED_API_KEY,
      fornecedor: "Verified Atacado",
      ...args,
    });
  }
  return { ok: false, error: `fornecedor desconhecido: ${slug}` };
}

// Refund automático Mercado Pago
export async function refundMercadoPago(paymentId: string): Promise<{ ok: boolean; detail: string }> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return { ok: false, detail: "MP_TOKEN_MISSING" };
  try {
    const idem = globalThis.crypto?.randomUUID?.() ?? `refund-${paymentId}-${Date.now()}`;
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idem,
      },
      body: "{}",
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    return { ok: true, detail: text.slice(0, 200) };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}
