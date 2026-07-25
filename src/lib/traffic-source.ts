// v249 — Classificação honesta de origem de tráfego.
// Módulo puro (testável) para não regredir: se alguém mexer no filtro,
// a suíte quebra antes de publicar (regra de gate de deploy v243).

export function hostOf(ref: string | null | undefined): string {
  if (!ref) return "";
  try {
    return new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** Hosts que representam eu mesmo navegando (editor, preview, próprio site). */
const INTERNAL = /(^|\.)(lovable\.dev|lovableproject\.com|lovable\.app|boostgg\.com\.br)$/;

export const AI_HOSTS: Record<string, string> = {
  "chatgpt.com": "ChatGPT (IA)",
  "chat.openai.com": "ChatGPT (IA)",
  "perplexity.ai": "Perplexity (IA)",
  "gemini.google.com": "Gemini (IA)",
  "copilot.microsoft.com": "Copilot (IA)",
  "claude.ai": "Claude (IA)",
  "you.com": "You.com (IA)",
};

const SEARCH = /^(google|bing|duckduckgo|yahoo|ecosia)\./;

/** true = visita interna (não conta como visitante real). */
export function isInternalTraffic(referrer: string | null | undefined): boolean {
  const h = hostOf(referrer);
  return !!h && INTERNAL.test(h);
}

export function classifyTrafficSource(
  utm: string | null | undefined,
  ref: string | null | undefined,
): string {
  const u = (utm ?? "").trim().toLowerCase();
  const h = hostOf(ref);
  if (AI_HOSTS[h]) return AI_HOSTS[h];
  if (AI_HOSTS[u]) return AI_HOSTS[u];
  if (u) return u;
  if (!h) return "direto";
  if (SEARCH.test(h)) return `busca: ${h}`;
  return h;
}
