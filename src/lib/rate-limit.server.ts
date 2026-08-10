// v252 — Rate limit ad-hoc (contador em banco) para rotas públicas de dinheiro.
// Não existe primitiva de rate limit no backend; usamos a função SQL
// public.rate_limit_check (SECURITY DEFINER, só service_role) como janela deslizante.
// Regra de ouro: NUNCA bloquear por erro de infra — se o check falhar, libera.

export type RateLimitResult = {
  allowed: boolean;
  hits: number;
  retryAfterSeconds: number;
};

/** Extrai um IP utilizável dos headers de proxy (Cloudflare / Lovable). */
export function clientIpFrom(headers: Headers): string {
  const cf = headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = headers.get("x-forwarded-for");
  if (xff) return (xff.split(",")[0] ?? "").trim() || "unknown";
  const real = headers.get("x-real-ip");
  return real?.trim() || "unknown";
}

/**
 * Consome 1 crédito da janela. Retorna allowed=false quando o limite estourou.
 * @param scope rótulo do endpoint (ex: "checkout-attempt")
 * @param identity IP ou outra identidade estável
 */
export async function checkRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("rate_limit_check" as any, {
      _key: `${scope}:${identity}`.slice(0, 200),
      _limit: limit,
      _window_seconds: windowSeconds,
    } as any);
    if (error) {
      console.error("[rate-limit] rpc error (fail-open):", error.message);
      return { allowed: true, hits: 0, retryAfterSeconds: 0 };
    }
    const row = Array.isArray(data) ? (data[0] as any) : (data as any);
    if (!row) return { allowed: true, hits: 0, retryAfterSeconds: 0 };
    if (row.allowed === false) {
      // v253 — registra que a trava atuou (observabilidade do "Saldo de Guardas")
      const { logGuard } = await import("@/lib/guard-events.server");
      void logGuard("RATE_LIMIT", { scope, limit, windowSeconds, hits: Number(row.hits ?? 0) });
    }
    return {
      allowed: row.allowed !== false,
      hits: Number(row.hits ?? 0),
      retryAfterSeconds: Number(row.retry_after_seconds ?? 0),
    };
  } catch (err) {
    console.error("[rate-limit] unexpected (fail-open):", err);
    return { allowed: true, hits: 0, retryAfterSeconds: 0 };
  }
}

/**
 * v607 — Leitura NÃO destrutiva da janela (não consome crédito).
 * Usada pelo Security Proxy do admin: nega antes de comparar o token quando o
 * IP já estourou o limite de falhas. Fail-open: erro de infra nunca tranca.
 */
export async function peekRateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("rate_limit_hits" as any)
      .select("id", { count: "exact", head: true })
      .eq("bucket_key", `${scope}:${identity}`.slice(0, 200))
      .gte("created_at", since);
    if (error) return false;
    return Number(count ?? 0) >= limit;
  } catch {
    return false;
  }
}
