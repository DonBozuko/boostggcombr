// Captura utm_source da URL atual (client-side). Retorna null no SSR.
// Aceita também gclid (Google Ads), fbclid (Meta), ttclid (TikTok) como sinais.
export function getUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const sp = new URLSearchParams(window.location.search);
    const utm = sp.get("utm_source");
    if (utm) return utm.slice(0, 60).toLowerCase();
    if (sp.get("gclid")) return "google";
    if (sp.get("fbclid")) return "facebook";
    if (sp.get("ttclid")) return "tiktok";
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
    return host.slice(0, 60);
  } catch {
    return null;
  }
}
