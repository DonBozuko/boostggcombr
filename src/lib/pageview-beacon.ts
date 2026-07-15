// Beacon client-side de page views. Silencioso, não bloqueia navegação.
// Nunca falha visível. Usa navigator.sendBeacon quando disponível.

const DEVICE_KEY = "ebp_did";
const SESSION_KEY = "ebp_sid";

function getOrCreate(storage: Storage, key: string): string {
  try {
    let v = storage.getItem(key);
    if (!v) {
      v = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
      storage.setItem(key, v);
    }
    return v;
  } catch {
    return "";
  }
}

function readUTM() {
  try {
    const url = new URL(window.location.href);
    const store = (k: string, v: string | null) => {
      if (v) sessionStorage.setItem(`ebp_${k}`, v);
    };
    store("utm_source", url.searchParams.get("utm_source"));
    store("utm_medium", url.searchParams.get("utm_medium"));
    store("utm_campaign", url.searchParams.get("utm_campaign"));
    return {
      utm_source: sessionStorage.getItem("ebp_utm_source"),
      utm_medium: sessionStorage.getItem("ebp_utm_medium"),
      utm_campaign: sessionStorage.getItem("ebp_utm_campaign"),
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null };
  }
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  try {
    const device_id = getOrCreate(localStorage, DEVICE_KEY);
    const session_id = getOrCreate(sessionStorage, SESSION_KEY);
    const utm = readUTM();
    const payload = JSON.stringify({
      path: path || window.location.pathname,
      referrer: document.referrer || null,
      device_id,
      session_id,
      ...utm,
    });

    const url = "/api/public/track";
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;
    // Fallback
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // silencioso
  }
}
