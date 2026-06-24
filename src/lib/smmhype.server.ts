// Server-only helper para disparar pedido no SMMhype.
// NÃO importar de código client-reachable em escopo de módulo.

// Service IDs definitivos:
// - Seguidores: 14325 (100–2000), 14225 (5000–100000)
// - Curtidas: 18860 (todas quantidades)
const LIKES_SERVICE_ID = 18860;
const VIEWS_SERVICE_ID = 18855;

export function resolveServiceId(pacote: string, quantidade: number): number | null {
  const p = String(pacote ?? "").trim().toLowerCase();
  if (p.startsWith("v")) return VIEWS_SERVICE_ID;
  if (p.startsWith("l")) return LIKES_SERVICE_ID;
  if (quantidade >= 100 && quantidade <= 2000) return 14325;
  if (quantidade >= 5000 && quantidade <= 100000) return 14225;
  return null;
}

// Compat: map por pacote id (inclui curtidas e visualizações).
export const SMMHYPE_SERVICE_IDS: Record<string, number> = {
  p100: 14325, p500: 14325, p1k: 14325, p2k: 14325,
  p5k: 14225, p10k: 14225, p20k: 14225, p50k: 14225, p100k: 14225,
  l100: LIKES_SERVICE_ID, l500: LIKES_SERVICE_ID, l1k: LIKES_SERVICE_ID,
  l2k: LIKES_SERVICE_ID, l5k: LIKES_SERVICE_ID,
  v1k: VIEWS_SERVICE_ID, v5k: VIEWS_SERVICE_ID, v10k: VIEWS_SERVICE_ID,
  v25k: VIEWS_SERVICE_ID, v50k: VIEWS_SERVICE_ID,
};


// Self-check: garante que todo pacote conhecido resolve para um service id válido,
// e simula um webhook de Curtidas (prefixo 'l*') roteando para o service 18860.
export function validateDispatcherConfig(): { ok: boolean; missing: string[]; assertions: string[] } {
  const known: Array<[string, number]> = [
    ["p100", 100], ["p500", 500], ["p1k", 1000], ["p2k", 2000],
    ["p5k", 5000], ["p10k", 10000], ["p20k", 20000], ["p50k", 50000], ["p100k", 100000],
    ["l100", 100], ["l500", 500], ["l1k", 1000], ["l2k", 2000], ["l5k", 5000],
    ["v1k", 1000], ["v5k", 5000], ["v10k", 10000], ["v25k", 25000], ["v50k", 50000],
  ];
  const missing = known
    .filter(([pkg, qty]) => resolveServiceId(pkg, qty) == null)
    .map(([pkg]) => pkg);

  const assertions: string[] = [];
  for (const [pkg, qty] of known.filter(([p]) => p.startsWith("l"))) {
    const sid = resolveServiceId(pkg, qty);
    if (sid !== LIKES_SERVICE_ID) {
      assertions.push(`prefixo 'l*' quebrado: ${pkg}(${qty}) → ${sid}, esperado ${LIKES_SERVICE_ID}`);
    }
  }
  for (const [pkg, qty] of known.filter(([p]) => p.startsWith("v"))) {
    const sid = resolveServiceId(pkg, qty);
    if (sid !== VIEWS_SERVICE_ID) {
      assertions.push(`prefixo 'v*' quebrado: ${pkg}(${qty}) → ${sid}, esperado ${VIEWS_SERVICE_ID}`);
    }
  }
  if (resolveServiceId("p500", 500) !== 14325) assertions.push("p500 deveria → 14325");
  if (resolveServiceId("p10k", 10000) !== 14225) assertions.push("p10k deveria → 14225");

  if (missing.length) console.error("[smmhype] dispatcher inválido — pacotes sem service id:", missing);
  if (assertions.length) console.error("[smmhype] asserts falharam:", assertions);
  else console.log("[smmhype] self-check OK · 19 pacotes (9 seg + 5 likes + 5 views)");
  return { ok: missing.length === 0 && assertions.length === 0, missing, assertions };
}

// roda na inicialização do módulo no servidor
validateDispatcherConfig();


const SMMHYPE_ENDPOINT = "https://smmhype.com/api/v2";

function normalizeInstagramUser(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const handle = trimmed.replace(/^@+/, "").replace(/^instagram\.com\//i, "");
  return `https://instagram.com/${handle}`;
}

export type SmmDispatchResult =
  | { ok: true; orderId?: string | number; body: unknown }
  | { ok: false; error: string; status?: number; body?: unknown };

export async function dispatchSmmhype(args: {
  pacote: string;
  quantidade: number;
  instagram_user: string;
}): Promise<SmmDispatchResult> {
  const smmKey = process.env.SMMHYPE_API_KEY;
  if (!smmKey) return { ok: false, error: "SMMHYPE_API_KEY ausente" };

  // Resolve service por pacote+quantidade; fallback no map por pacote.
  const serviceId =
    resolveServiceId(args.pacote, args.quantidade) ??
    SMMHYPE_SERVICE_IDS[String(args.pacote ?? "").trim().toLowerCase()];
  if (!serviceId) {
    return {
      ok: false,
      error: `service id ausente p/ quantidade=${args.quantidade} pacote=${args.pacote}`,
    };
  }

  const link = normalizeInstagramUser(args.instagram_user);
  const body = new URLSearchParams({
    key: smmKey,
    action: "add",
    service: String(serviceId),
    link,
    quantity: String(args.quantidade),
  });

  const res = await fetch(SMMHYPE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await res.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* não-JSON */ }

  if (!res.ok || (json && (json as { error?: string }).error)) {
    return { ok: false, error: "SMMhype falhou", status: res.status, body: json ?? text };
  }
  const orderId = (json as { order?: string | number } | null)?.order;
  return { ok: true, orderId, body: json ?? text };
}
