// Server-only helper para disparar pedido no SMMhype.
// NÃO importar de código client-reachable em escopo de módulo.

export const SMMHYPE_SERVICE_IDS: Record<string, number> = {
  start: 14325,
  growth: 14325,
  vip: 14225,
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
  const pacoteKey = String(args.pacote ?? "").trim().toLowerCase();
  const serviceId = SMMHYPE_SERVICE_IDS[pacoteKey];
  if (!serviceId) return { ok: false, error: `service id ausente p/ pacote ${args.pacote}` };

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
