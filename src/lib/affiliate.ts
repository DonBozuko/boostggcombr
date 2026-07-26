// v265 — Captura de indicação de afiliado.
// First-touch: o primeiro código que trouxe a pessoa ganha a comissão por 30 dias.
// Guardamos em COOKIE (não localStorage) de propósito: assim o servidor lê a
// indicação direto no criarPedido, sem precisar tocar em nenhum checkout.

export const REF_COOKIE = "ebp_ref";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export function normalizeRefCode(v: string | null | undefined): string | null {
  if (!v) return null;
  const c = v.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return c.length >= 4 ? c : null;
}

export function readRefCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${REF_COOKIE}=([^;]*)`));
  return m ? normalizeRefCode(decodeURIComponent(m[1])) : null;
}

/** Chama no boot do app. Só grava se ainda não houver indicação (first-touch). */
export function captureAffiliateRef(): void {
  if (typeof window === "undefined") return;
  try {
    const sp = new URLSearchParams(window.location.search);
    const code = normalizeRefCode(sp.get("ref") ?? sp.get("aff"));
    if (!code) return;
    if (readRefCookie()) return;
    document.cookie = `${REF_COOKIE}=${encodeURIComponent(code)}; max-age=${MAX_AGE}; path=/; SameSite=Lax`;
  } catch {
    /* cookie bloqueado: indicação simplesmente não conta */
  }
}

// ---- Regras de comissão (puras, testáveis) ----
export const AFFILIATE_DEFAULT_PCT = 0.10;
/** Abaixo disso não paga comissão: pedido pequeno não sustenta o custo. */
export const AFFILIATE_MIN_ORDER_BRL = 10;
/** Teto duro por pedido: protege a margem contra configuração errada. */
export const AFFILIATE_MAX_PCT = 0.15;

export function affiliateCommission(valorPedido: number, pct: number): number {
  const v = Number(valorPedido) || 0;
  if (v < AFFILIATE_MIN_ORDER_BRL) return 0;
  const p = Math.max(0, Math.min(AFFILIATE_MAX_PCT, Number(pct) || 0));
  return Math.floor(v * p * 100) / 100;
}
