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
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(opts.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { /* */ }
      const apiError = (json as { error?: string } | null)?.error;
      if (!res.ok || apiError) {
        const detail = apiError ? String(apiError) : text.slice(0, 200);
        return { ok: false, error: `${opts.fornecedor} falhou: ${detail}`, status: res.status, body: json ?? text };
      }
      const orderId = (json as { order?: string | number } | null)?.order;
      if (orderId == null || orderId === "") {
        return { ok: false, error: `${opts.fornecedor}: resposta sem orderId (${text.slice(0, 200)})`, status: res.status, body: json ?? text };
      }
      return { ok: true, orderId, body: json ?? text };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const msg = (err as Error).name === "AbortError" ? "timeout 15s" : (err as Error).message;
    return { ok: false, error: `${opts.fornecedor}: rede ${msg}` };
  }
}

// v222 — Circuit breaker + retry transient: se erro de rede/timeout, tenta 1x
// de novo antes de deixar o failover cair pro próximo fornecedor. Isso mata
// ~70% dos alertas "provider falhou" causados por blip de rede.
async function isCircuitOpen(slug: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("provider_health")
      .select("unstable_until, failure_count")
      .eq("slug", slug)
      .maybeSingle();
    const row = data as { unstable_until: string | null; failure_count: number | null } | null;
    if (!row) return false;
    if (row.unstable_until && new Date(row.unstable_until).getTime() > Date.now()) return true;
    return false;
  } catch { return false; }
}

async function recordDispatchResult(slug: string, ok: boolean, err?: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (ok) {
      await supabaseAdmin.from("provider_health").upsert(
        { slug, failure_count: 0, unstable_until: null, updated_at: new Date().toISOString() } as never,
        { onConflict: "slug" },
      );
      return;
    }
    const { data: cur } = await supabaseAdmin
      .from("provider_health")
      .select("failure_count")
      .eq("slug", slug)
      .maybeSingle();
    const next = Number((cur as { failure_count?: number } | null)?.failure_count ?? 0) + 1;
    // 3 falhas seguidas → circuit aberto por 10min (breaker próprio, sem depender do smart-routing)
    const openBreaker = next >= 3;
    await supabaseAdmin.from("provider_health").upsert(
      {
        slug,
        failure_count: next,
        last_error: (err ?? "").slice(0, 300),
        last_failure_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(openBreaker ? { unstable_until: new Date(Date.now() + 10 * 60_000).toISOString() } : {}),
      } as never,
      { onConflict: "slug" },
    );
    if (openBreaker) {
      // v253 — registra o acionamento do breaker para o painel "Saldo de Guardas"
      const { logGuard } = await import("@/lib/guard-events.server");
      void logGuard("CIRCUIT_BREAKER", { slug, falhas: next, erro: (err ?? "").slice(0, 200) });
    }
  } catch { /* noop */ }
}

// v251 — política de retry centralizada e testada (backoff exponencial + jitter)
import { backoffDelayMs, isTransientError, MAX_DISPATCH_ATTEMPTS } from "@/lib/retry-policy";


export async function dispatchByFornecedor(slug: string, args: {
  pacote: string; quantidade: number; instagram_user: string;
  serviceIdOverride?: string | number | null;
}): Promise<SmmDispatchResult> {
  // Circuit breaker: se aberto, skip imediato (failover chain vai pro próximo)
  if (await isCircuitOpen(slug)) {
    return { ok: false, error: `${slug}: circuit breaker aberto (3+ falhas seguidas nos últimos 10min)` };
  }

  // v245 — lê config do fornecedor do banco (genérico, funciona para provider4)
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: f } = await supabaseAdmin
    .from("fornecedores")
    .select("nome, api_url, api_key_secret")
    .eq("slug", slug)
    .maybeSingle();
  const apiKey = f ? process.env[(f as any).api_key_secret] : undefined;

  const doOne = async (): Promise<SmmDispatchResult> => {
    if (slug === "smmhype") {
      const { dispatchSmmhype } = await import("./smmhype.server");
      return dispatchSmmhype(args);
    }
    if (args.serviceIdOverride == null || String(args.serviceIdOverride).trim() === "") {
      return { ok: false, error: `${slug}: ID reserva real ausente no pricing_items` };
    }
    if (!f || !(f as any).api_url) {
      return { ok: false, error: `fornecedor desconhecido ou sem endpoint: ${slug}` };
    }
    if (!apiKey) {
      return { ok: false, error: `${slug}: API key ausente (secret ${(f as any).api_key_secret})` };
    }
    return dispatchSmmV2({
      endpoint: (f as any).api_url,
      apiKey,
      fornecedor: (f as any).nome ?? slug,
      ...args,
    });
  };

  let r = await doOne();
  // v251 — Retry com backoff exponencial + jitter (1.5s → 5s) em erro transient
  // de rede/5xx/429. Erro de negócio (saldo, service id) NÃO faz retry: cai
  // direto pro próximo fornecedor no failover.
  for (let attempt = 2; attempt <= MAX_DISPATCH_ATTEMPTS && !r.ok && isTransientError(r.error ?? ""); attempt++) {
    await new Promise((res) => setTimeout(res, backoffDelayMs(attempt)));
    r = await doOne();
  }

  await recordDispatchResult(slug, r.ok, r.ok ? undefined : r.error);
  return r;
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

// v230 — Cancel no fornecedor ANTES de reembolsar. Recupera saldo se ainda não entregou.
// Retorna ok=true se conseguiu cancelar OU se o fornecedor não tem esse pedido (nada a perder).
// Retorna ok=false quando o pedido está em andamento/entregue → indica prejuízo se reembolsar.
export async function cancelAtProvider(
  slug: string,
  providerOrderId: string,
): Promise<{ ok: boolean; detail: string; recoverable: boolean }> {
  // v245 — lê config do fornecedor do banco (genérico, funciona para provider4)
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: f } = await supabaseAdmin
    .from("fornecedores")
    .select("api_url, api_key_secret")
    .eq("slug", slug)
    .maybeSingle();
  if (!f) return { ok: false, detail: `fornecedor desconhecido: ${slug}`, recoverable: false };
  const endpoint = (f as any).api_url as string;
  const apiKey = process.env[(f as any).api_key_secret];
  if (!apiKey) return { ok: false, detail: `${slug}: API key ausente`, recoverable: false };
  if (!providerOrderId) return { ok: true, detail: "sem provider_order_id (nada a cancelar)", recoverable: true };

  const body = new URLSearchParams({ key: apiKey, action: "cancel", order: String(providerOrderId) });
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: ctrl.signal,
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* */ }
      const err = String(json?.error ?? "").toLowerCase();
      // sucesso puro
      if (res.ok && !err) return { ok: true, detail: text.slice(0, 200), recoverable: true };
      // "incorrect order id" = fornecedor não conhece esse pedido → seguro reembolsar
      if (/incorrect.*order|not.*found|invalid.*order/i.test(err)) {
        return { ok: true, detail: `provider não tem o pedido: ${err}`, recoverable: true };
      }
      // outros erros: em andamento / já entregue / não cancelável → PREJUÍZO se reembolsar
      return { ok: false, detail: `provider recusou cancel: ${err || text.slice(0, 120)}`, recoverable: false };
    } finally { clearTimeout(timer); }
  } catch (e) {
    const msg = (e as Error).name === "AbortError" ? "timeout 12s" : (e as Error).message;
    return { ok: false, detail: `rede: ${msg}`, recoverable: false };
  }
}

// v225 — Anti dupla-entrega FAIL-SAFE: consulta MP se já existe refund registrado.
// Em erro/timeout retorna TRUE (bloqueia reprocesso) — melhor atrasar 1 pedido do que entregar 2x um reembolsado.
// Sem token → mantém false (dev/setup incompleto não trava produção que já roda).
export async function hasMpRefund(paymentId: string): Promise<boolean> {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token || !paymentId) return false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.warn("[hasMpRefund] MP HTTP", res.status, "→ fail-safe TRUE (bloqueia reprocesso)");
        return true;
      }
      const arr = JSON.parse(await res.text());
      return Array.isArray(arr) && arr.length > 0;
    } finally {
      clearTimeout(timer);
    }
  } catch (e) {
    console.warn("[hasMpRefund] MP error → fail-safe TRUE:", (e as Error).message);
    return true;
  }
}
