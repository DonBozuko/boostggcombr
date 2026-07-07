// UTM capture — first-touch persisted em sessionStorage.
// Captura os 4 campos padrão (source/medium/campaign/content) + term.
// utm_content é o CRIATIVO — indispensável pra ROAS por anúncio.

const STORAGE_KEY = "ebp_utm_v1";
const MAX = 60;

export type UtmParams = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
};

function empty(): UtmParams {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
  };
}

function clean(v: string | null): string | null {
  if (!v) return null;
  return v.slice(0, MAX).toLowerCase().trim() || null;
}

function inferSource(sp: URLSearchParams): string | null {
  const s = clean(sp.get("utm_source"));
  if (s) return s;
  if (sp.get("gclid")) return "google";
  if (sp.get("fbclid")) return "facebook";
  if (sp.get("ttclid")) return "tiktok";
  try {
    const ref = document.referrer;
    if (!ref) return "direct";
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host.includes("google.")) return "google";
    if (host.includes("instagram.")) return "instagram";
    if (host.includes("tiktok.")) return "tiktok";
    if (host.includes("facebook.") || host.includes("fb.")) return "facebook";
    if (host.includes("youtube.")) return "youtube";
    if (host.includes("t.me") || host.includes("telegram.")) return "telegram";
    if (host.includes("bing.")) return "bing";
    return host.slice(0, MAX);
  } catch {
    return "direct";
  }
}

// Captura da URL + first-touch persistido.
export function getUtmParams(): UtmParams {
  if (typeof window === "undefined") return empty();
  try {
    const sp = new URLSearchParams(window.location.search);
    const hasAnyUtm =
      sp.get("utm_source") || sp.get("utm_medium") || sp.get("utm_campaign") ||
      sp.get("utm_content") || sp.get("utm_term") ||
      sp.get("gclid") || sp.get("fbclid") || sp.get("ttclid");

    if (hasAnyUtm) {
      const fresh: UtmParams = {
        utm_source: inferSource(sp),
        utm_medium: clean(sp.get("utm_medium")),
        utm_campaign: clean(sp.get("utm_campaign")),
        utm_content: clean(sp.get("utm_content")),
        utm_term: clean(sp.get("utm_term")),
      };
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {}
      return fresh;
    }

    // Sem UTM na URL — tenta first-touch da sessão
    try {
      const cached = window.sessionStorage.getItem(STORAGE_KEY);
      if (cached) return JSON.parse(cached) as UtmParams;
    } catch {}

    // Fallback: infere pela referrer
    return { ...empty(), utm_source: inferSource(sp) };
  } catch {
    return empty();
  }
}

// Compat: mantém a assinatura antiga.
export function getUtmSource(): string | null {
  return getUtmParams().utm_source;
}
