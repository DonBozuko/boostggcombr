// Server-only helper para disparar pedido no SMMhype.
// NÃO importar de código client-reachable em escopo de módulo.

// Service IDs definitivos (revalidados contra o catálogo vivo em v272):
// - Seguidores IG: 14325 (todas as faixas). 14225 MORREU no fornecedor.
// - Curtidas: 18860 (todas quantidades)
const IG_FOLLOWERS_SERVICE_ID = 14325;
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
// v272: 7593 saiu do catálogo → substituído por 14336 (Facebook Post Likes, refill 30d).
const FB_LIKES_SERVICE_ID = 14336;
// Tráfego Web (SMMhype)
const WEB_TRAFFIC_BR_SERVICE_ID = 9313;
const WEB_TRAFFIC_WORLD_SERVICE_ID = 10351;
// Telegram (SMMhype) — v272: 19106/19107 viraram "YouTube Live Views" no fornecedor
// (entregaria produto ERRADO). Trocados pelos IDs reais de membros.
const TG_CHANNEL_SERVICE_ID = 17200; // Membros MIX (min 500)
const TG_GROUP_SERVICE_ID = 17200;   // mesmo serviço aceita grupo
// Kwai (SMMhype) — v210
const KW_FOLLOWERS_SERVICE_ID = 8330; // Seguidores BR (refill 30d)
const KW_LIKES_SERVICE_ID = 8331;     // Curtidas BR (refill 30d)
const KW_VIEWS_SERVICE_ID = 2758;     // Views HQ


export function resolveServiceId(pacote: string, quantidade: number): number | null {
  const p = String(pacote ?? "").trim().toLowerCase();
  // Telegram: tgc* (canal), tgg* (grupo); tgm* legado → canal por padrão
  if (p.startsWith("tgc")) return TG_CHANNEL_SERVICE_ID;
  if (p.startsWith("tgg")) return TG_GROUP_SERVICE_ID;
  if (p.startsWith("tgm")) return TG_CHANNEL_SERVICE_ID;
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
  // Kwai prefixes: kf* / kl* / kv*
  if (p.startsWith("kf")) return KW_FOLLOWERS_SERVICE_ID;
  if (p.startsWith("kl")) return KW_LIKES_SERVICE_ID;
  if (p.startsWith("kv")) return KW_VIEWS_SERVICE_ID;
  if (p.startsWith("v")) return VIEWS_SERVICE_ID;
  if (p.startsWith("l")) return LIKES_SERVICE_ID;
  if (quantidade >= 20) return IG_FOLLOWERS_SERVICE_ID;
  return null;
}

// Mapeia prefixo do pacote para (rede, tipo) usado na chave de override.
// Prefixo `br-` força variante brasileira (populada automaticamente pelo autoPopulateBrMatrix no sync).
export function packageToNetworkType(pacote: string): { network: string; type: string } | null {
  let p = String(pacote ?? "").trim().toLowerCase();
  const isBr = p.startsWith("br-");
  if (isBr) p = p.slice(3);
  const suffix = isBr ? "_br" : "";
  if (p.startsWith("tgc") || p.startsWith("tgm")) return { network: "telegram", type: "canal" + suffix };
  if (p.startsWith("tgg")) return { network: "telegram", type: "grupo" + suffix };
  if (p.startsWith("tf")) return { network: "tiktok", type: "followers" + suffix };
  if (p.startsWith("tl")) return { network: "tiktok", type: "likes" + suffix };
  if (p.startsWith("tv")) return { network: "tiktok", type: "views" + suffix };
  if (p.startsWith("ys")) return { network: "youtube", type: "followers" + suffix };
  if (p.startsWith("yv")) return { network: "youtube", type: "views" + suffix };
  if (p.startsWith("ff")) return { network: "facebook", type: "followers" + suffix };
  if (p.startsWith("fl")) return { network: "facebook", type: "likes" + suffix };
  if (p.startsWith("wbr")) return { network: "trafego", type: "br" };
  if (p.startsWith("wgl")) return { network: "trafego", type: "global" };
  if (p.startsWith("kf")) return { network: "kwai", type: "followers" };
  if (p.startsWith("kl")) return { network: "kwai", type: "likes" };
  if (p.startsWith("kv")) return { network: "kwai", type: "views" };
  if (p.startsWith("v"))  return { network: "instagram", type: "views" + suffix };
  if (p.startsWith("l"))  return { network: "instagram", type: "likes" + suffix };
  if (p.startsWith("p"))  return { network: "instagram", type: "followers" + suffix };
  return null;
}

// v49 — resolver tier-aware. Consulta service_id_matrix (1 ID por faixa de quantidade)
// → service_id_overrides (override manual) → resolveServiceId hardcoded.
export async function resolveServiceIdAsync(pacote: string, quantidade: number): Promise<number | null> {
  const nt = packageToNetworkType(pacote);
  if (nt) {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // 1) Matriz por tier (v49)
      const { data: tier } = await supabaseAdmin
        .from("service_id_matrix" as any)
        .select("service_id")
        .eq("network", nt.network)
        .eq("service_type", nt.type)
        .lte("min_qty", quantidade)
        .gte("max_qty", quantidade)
        .order("min_qty", { ascending: false })
        .limit(1)
        .maybeSingle();
      const tsid = Number((tier as any)?.service_id);
      if (Number.isFinite(tsid) && tsid > 0) return tsid;

      // 2) Override antigo (1 ID por rede/tipo)
      const { data } = await supabaseAdmin
        .from("service_id_overrides")
        .select("service_id")
        .eq("network", nt.network)
        .eq("service_type", nt.type)
        .maybeSingle();
      const sid = Number((data as any)?.service_id);
      if (Number.isFinite(sid) && sid > 0) return sid;
    } catch (e) {
      console.warn("[smmhype] tier/override lookup failed:", e);
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
  p100: IG_FOLLOWERS_SERVICE_ID, p500: IG_FOLLOWERS_SERVICE_ID, p1k: IG_FOLLOWERS_SERVICE_ID, p2k: IG_FOLLOWERS_SERVICE_ID,
  p5k: IG_FOLLOWERS_SERVICE_ID, p10k: IG_FOLLOWERS_SERVICE_ID, p20k: IG_FOLLOWERS_SERVICE_ID, p50k: IG_FOLLOWERS_SERVICE_ID, p100k: IG_FOLLOWERS_SERVICE_ID,
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
  tgc500: TG_CHANNEL_SERVICE_ID, tgc1k: TG_CHANNEL_SERVICE_ID,
  tgg500: TG_GROUP_SERVICE_ID,   tgg1k: TG_GROUP_SERVICE_ID,
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
  if (resolveServiceId("p10k", 10000) !== 14325) assertions.push("p10k deveria → 14325");

  if (missing.length) console.error("[smmhype] dispatcher inválido — pacotes sem service id:", missing);
  if (assertions.length) console.error("[smmhype] asserts falharam:", assertions);
  else console.log("[smmhype] self-check OK · 19 pacotes (9 seg + 5 likes + 5 views)");
  return { ok: missing.length === 0 && assertions.length === 0, missing, assertions };
}

// roda na inicialização do módulo no servidor
validateDispatcherConfig();


const SMMHYPE_ENDPOINT = "https://smmhype.com/api/v2";

// v303 — a limpeza mora em `@/lib/target-link` (ponto único de verdade).
// Reexportado aqui só para não quebrar os imports existentes.
import { stripTrackers, normalizeInstagramUser } from "./target-link";
export { stripTrackers, normalizeInstagramUser };


function normalizeTiktokTarget(raw: string, isFollowers: boolean): string {
  const trimmed = /^https?:\/\//i.test(raw.trim()) ? stripTrackers(raw.trim()) : raw.trim();
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
  const trimmed = /^https?:\/\//i.test(raw.trim()) ? stripTrackers(raw.trim()) : raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.)?(m\.|music\.)?youtube\.com\//i.test(trimmed) || /^youtu\.be\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^www\./i, "")}`;
  }
  return trimmed;
}

function normalizeFacebookTarget(raw: string): string {
  const trimmed = /^https?:\/\//i.test(raw.trim()) ? stripTrackers(raw.trim()) : raw.trim();
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
  serviceIdOverride?: string | number | null;
  pedidoId?: string | null;
}): Promise<SmmDispatchResult> {
  const smmKey = process.env.SMMHYPE_API_KEY;
  if (!smmKey) return { ok: false, error: "SMMHYPE_API_KEY ausente" };

  // v85: override explícito do pricing_items > resolver dinâmico
  const overrideRaw = args.serviceIdOverride != null && String(args.serviceIdOverride).trim() !== ""
    ? Number(args.serviceIdOverride)
    : NaN;
  const serviceId = Number.isFinite(overrideRaw) && overrideRaw > 0
    ? overrideRaw
    : await resolveServiceIdAsync(args.pacote, args.quantidade);
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

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15_000);
  // v374 — trilha forense: grava SEMPRE, com corpo bruto sem truncar.
  const { logDispatchAttempt } = await import("./dispatch-log.server");
  const base = {
    provider_slug: "smmhype",
    pacote: args.pacote,
    service_id: serviceId,
    quantidade: args.quantidade,
    target_link: link,
    pedido_id: args.pedidoId ?? null,
  };
  try {
    const res = await fetch(SMMHYPE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: ctrl.signal,
    });
    const text = await res.text();
    // v383 — leitor único: pega erro escondido em HTTP 200, envelope diferente
    // e orderId inválido (0/"error"). Antes só olhava `json.error`.
    const { interpretProviderResponse } = await import("./dispatch-response");
    const read = interpretProviderResponse(text, res.status);
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* não-JSON */ }

    if (!read.ok) {
      // v383 — trilha forense é prova: aguarda a gravação (worker pode ser
      // encerrado logo após a resposta e matar promessa solta).
      await logDispatchAttempt({ ...base, ok: false, http_status: res.status, raw_response: text, error_text: `SMMhype falhou: ${read.error}` });
      return { ok: false, error: `SMMhype falhou: ${read.error}`, status: res.status, body: json ?? text };
    }
    await logDispatchAttempt({ ...base, ok: true, http_status: res.status, raw_response: text, order_id: read.orderId });
    return { ok: true, orderId: read.orderId, body: json ?? text };
  } catch (err) {
    const msg = (err as Error).name === "AbortError" ? "timeout 15s" : (err as Error).message;
    await logDispatchAttempt({ ...base, ok: false, raw_response: null, error_text: `rede ${msg}` });
    return { ok: false, error: `SMMhype: rede ${msg}` };

  } finally {
    clearTimeout(timer);
  }
}

