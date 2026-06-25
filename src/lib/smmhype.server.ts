// Server-only helper para disparar pedido no SMMhype.
// NÃO importar de código client-reachable em escopo de módulo.

// Service IDs definitivos:
// - Seguidores: 14325 (100–2000), 14225 (5000–100000)
// - Curtidas: 18860 (todas quantidades)
const LIKES_SERVICE_ID = 18860;
const VIEWS_SERVICE_ID = 18855;
// TikTok (SMMhype)
const TT_FOLLOWERS_SERVICE_ID = 14330;
const TT_LIKES_SERVICE_ID = 19191;
const TT_VIEWS_SERVICE_ID = 14907;
// YouTube (SMMhype)
const YT_SUBSCRIBERS_SERVICE_ID = 19440;
const YT_VIEWS_SERVICE_ID = 14321;
// Facebook (SMMhype)
const FB_FOLLOWERS_SERVICE_ID = 18870;
const FB_LIKES_SERVICE_ID = 7593;
// Tráfego Web (SMMhype)
const WEB_TRAFFIC_BR_SERVICE_ID = 9313;
const WEB_TRAFFIC_WORLD_SERVICE_ID = 10351;

export function resolveServiceId(pacote: string, quantidade: number): number | null {
  const p = String(pacote ?? "").trim().toLowerCase();
  // Telegram prefixes: tgm* (members) — IDs ainda pendentes de provisionamento
  if (p.startsWith("tg")) return null;
  // Tráfego Web prefixes: wbr* (Brasil), wgl* (Global)
  if (p.startsWith("wbr")) return WEB_TRAFFIC_BR_SERVICE_ID;
  if (p.startsWith("wgl")) return WEB_TRAFFIC_WORLD_SERVICE_ID;
  // Facebook prefixes: ff* (followers), fl* (likes)
  if (p.startsWith("ff")) return FB_FOLLOWERS_SERVICE_ID;
  if (p.startsWith("fl")) return FB_LIKES_SERVICE_ID;
  // YouTube prefixes: ys* (subscribers), yv* (views)
  if (p.startsWith("ys")) return YT_SUBSCRIBERS_SERVICE_ID;
  if (p.startsWith("yv")) return YT_VIEWS_SERVICE_ID;
  // TikTok prefixes: tf* / tl* / tv*
  if (p.startsWith("tf")) return TT_FOLLOWERS_SERVICE_ID;
  if (p.startsWith("tl")) return TT_LIKES_SERVICE_ID;
  if (p.startsWith("tv")) return TT_VIEWS_SERVICE_ID;
  if (p.startsWith("v")) return VIEWS_SERVICE_ID;
  if (p.startsWith("l")) return LIKES_SERVICE_ID;
  if (quantidade >= 100 && quantidade <= 2000) return 14325;
  if (quantidade >= 5000 && quantidade <= 100000) return 14225;
  return null;
}

// Mapeia prefixo do pacote para (rede, tipo) usado na chave de override.
export function packageToNetworkType(pacote: string): { network: string; type: string } | null {
  const p = String(pacote ?? "").trim().toLowerCase();
  if (p.startsWith("tf")) return { network: "tiktok", type: "followers" };
  if (p.startsWith("tl")) return { network: "tiktok", type: "likes" };
  if (p.startsWith("tv")) return { network: "tiktok", type: "views" };
  if (p.startsWith("ys")) return { network: "youtube", type: "followers" };
  if (p.startsWith("yv")) return { network: "youtube", type: "views" };
  if (p.startsWith("ff")) return { network: "facebook", type: "followers" };
  if (p.startsWith("fl")) return { network: "facebook", type: "likes" };
  if (p.startsWith("v"))  return { network: "instagram", type: "views" };
  if (p.startsWith("l"))  return { network: "instagram", type: "likes" };
  if (p.startsWith("p"))  return { network: "instagram", type: "followers" };
  return null;
}

// Consulta service_id_overrides; se não houver override válido, cai no resolveServiceId hardcoded.
export async function resolveServiceIdAsync(pacote: string, quantidade: number): Promise<number | null> {
  const nt = packageToNetworkType(pacote);
  if (nt) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("service_id_overrides")
        .select("service_id")
        .eq("network", nt.network)
        .eq("service_type", nt.type)
        .maybeSingle();
      const sid = Number((data as any)?.service_id);
      if (Number.isFinite(sid) && sid > 0) return sid;
    } catch (e) {
      console.warn("[smmhype] override lookup failed:", e);
    }
  }
  return (
    resolveServiceId(pacote, quantidade) ??
    SMMHYPE_SERVICE_IDS[String(pacote ?? "").trim().toLowerCase()] ??
    null
  );
}

// Compat: map por pacote id (inclui curtidas e visualizações).
export const SMMHYPE_SERVICE_IDS: Record<string, number> = {
  p100: 14325, p500: 14325, p1k: 14325, p2k: 14325,
  p5k: 14225, p10k: 14225, p20k: 14225, p50k: 14225, p100k: 14225,
  l100: LIKES_SERVICE_ID, l500: LIKES_SERVICE_ID, l1k: LIKES_SERVICE_ID,
  l2k: LIKES_SERVICE_ID, l5k: LIKES_SERVICE_ID,
  v1k: VIEWS_SERVICE_ID, v5k: VIEWS_SERVICE_ID, v10k: VIEWS_SERVICE_ID,
  v25k: VIEWS_SERVICE_ID, v50k: VIEWS_SERVICE_ID,
  tf100: TT_FOLLOWERS_SERVICE_ID, tf500: TT_FOLLOWERS_SERVICE_ID, tf1k: TT_FOLLOWERS_SERVICE_ID,
  tl500: TT_LIKES_SERVICE_ID, tl1k: TT_LIKES_SERVICE_ID, tl2k: TT_LIKES_SERVICE_ID,
  tv5k: TT_VIEWS_SERVICE_ID, tv10k: TT_VIEWS_SERVICE_ID, tv50k: TT_VIEWS_SERVICE_ID,
  ys100: YT_SUBSCRIBERS_SERVICE_ID, ys500: YT_SUBSCRIBERS_SERVICE_ID, ys1k: YT_SUBSCRIBERS_SERVICE_ID,
  yv1k: YT_VIEWS_SERVICE_ID, yv5k: YT_VIEWS_SERVICE_ID, yv10k: YT_VIEWS_SERVICE_ID,
  ff500: FB_FOLLOWERS_SERVICE_ID, ff1k: FB_FOLLOWERS_SERVICE_ID, ff2k5: FB_FOLLOWERS_SERVICE_ID,
  fl500: FB_LIKES_SERVICE_ID, fl1k: FB_LIKES_SERVICE_ID, fl2k: FB_LIKES_SERVICE_ID,
  wbr1k: WEB_TRAFFIC_BR_SERVICE_ID, wbr5k: WEB_TRAFFIC_BR_SERVICE_ID, wbr10k: WEB_TRAFFIC_BR_SERVICE_ID,
  wgl1k: WEB_TRAFFIC_WORLD_SERVICE_ID, wgl5k: WEB_TRAFFIC_WORLD_SERVICE_ID, wgl10k: WEB_TRAFFIC_WORLD_SERVICE_ID,
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

function normalizeTiktokTarget(raw: string, isFollowers: boolean): string {
  const trimmed = raw.trim();
  if (isFollowers) {
    // Aceita: @user, user, tiktok.com/@user, https://(www.)tiktok.com/@user
    const handle = trimmed
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/^(m\.|vm\.)?tiktok\.com\//i, "")
      .replace(/^@+/, "")
      .replace(/[/?#].*$/, "")
      .trim();
    if (!handle) return trimmed;
    return `https://www.tiktok.com/@${handle}`;
  }
  // Curtidas/Views: precisa ser URL de vídeo. Garante protocolo.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?(m\.|vm\.)?tiktok\.com\//i.test(trimmed)) return `https://${trimmed.replace(/^www\./i, "")}`;
  return trimmed;
}

function normalizeYoutubeTarget(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?(m\.|music\.)?youtube\.com\//i.test(trimmed) || /^youtu\.be\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^www\./i, "")}`;
  }
  return trimmed;
}

function normalizeFacebookTarget(raw: string): string {
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|m\.|web\.)?facebook\.com\//i.test(trimmed) || /^fb\.com\//i.test(trimmed) || /^fb\.watch\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^www\./i, "")}`;
  }
  // handle simples: trata como página
  const handle = trimmed.replace(/^@+/, "").replace(/[/?#].*$/, "");
  if (handle) return `https://www.facebook.com/${handle}`;
  return trimmed;
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

  const pkg = String(args.pacote ?? "").trim().toLowerCase();
  const isTrafego = pkg.startsWith("w");
  const isTelegram = pkg.startsWith("tg");
  const isFacebook = !isTrafego && !isTelegram && pkg.startsWith("f");
  const isYoutube = !isFacebook && !isTrafego && !isTelegram && pkg.startsWith("y");
  const isTiktok = !isFacebook && !isYoutube && !isTrafego && !isTelegram && pkg.startsWith("t");
  // Tráfego/Telegram: link já é URL completa http(s)://; só passa adiante
  const passthrough = (raw: string) => raw.trim();
  const link = isTrafego || isTelegram
    ? passthrough(args.instagram_user)
    : isFacebook
    ? normalizeFacebookTarget(args.instagram_user)
    : isYoutube
    ? normalizeYoutubeTarget(args.instagram_user)
    : isTiktok
    ? normalizeTiktokTarget(args.instagram_user, pkg.startsWith("tf"))
    : normalizeInstagramUser(args.instagram_user);
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
