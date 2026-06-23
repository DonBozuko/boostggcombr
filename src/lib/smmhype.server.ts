// Server-only helper para disparar pedido no SMMhype.
// NÃO importar de código client-reachable em escopo de módulo.

// Service IDs definitivos (Nov/2025):
// - 14325 para quantidades 100 a 2000
// - 14225 para quantidades 5000 a 100000
export function resolveServiceId(quantidade: number): number | null {
  if (quantidade >= 100 && quantidade <= 2000) return 14325;
  if (quantidade >= 5000 && quantidade <= 100000) return 14225;
  return null;
}

// Compat: ainda exportamos um map por pacote id usado por código antigo.
export const SMMHYPE_SERVICE_IDS: Record<string, number> = {
  p100: 14325,
  p500: 14325,
  p1k: 14325,
  p2k: 14325,
  p5k: 14225,
  p10k: 14225,
  p20k: 14225,
  p50k: 14225,
  p100k: 14225,
};

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

  // Resolve service por quantidade (fonte de verdade); fallback no map por pacote.
  const serviceId =
    resolveServiceId(args.quantidade) ??
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
