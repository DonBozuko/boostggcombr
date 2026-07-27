// Auto-resolver de service_id por fornecedor.
// Quando pricing_items.<provider>_service_id está NULL, busca no cache do fornecedor
// o serviço mais barato que:
//  - bate categoria (kwai:seguidores, instagram:curtidas, ...)
//  - aceita a quantidade (min <= qtd <= max)
//  - tem refill se o pacote pede
//  - é brasileiro quando o pacote é brasileiro
// Resultado salvo em pricing_items.<provider>_auto_id (não sobrescreve o manual).

type Provider = "smmhype" | "smmpanel" | "verified";

type CacheRow = {
  provider_service_id: string;
  name: string;
  category: string;
  rate: number;
  min: number;
  max: number;
  refill: boolean | null;
};

type PricingItem = {
  pacote: string;
  category: string;
  quantidade: number;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
  smmhype_auto_id: string | null;
  smmpanel_auto_id: string | null;
  verified_auto_id: string | null;
};

// Categorias do pricing_items → palavras-chave que devem aparecer no name/category
// do cache do fornecedor. Todas em minúsculas.
// v308 — nenhum pacote nosso é de transmissão ao vivo. Serviço de live entregando
// "curtida" ou "view" é a origem histórica de pacote errado vinculado.
const GLOBAL_NOT = ["live", "ao vivo", "espectador", "transmiss", "stream", "drip", "comment"];

const CATEGORY_MATCHERS: Record<string, { any: string[][]; must?: string[]; not?: string[] }> = {
  "instagram:seguidores": {
    any: [["instagram", "follow"], ["instagram", "seguidor"]],
    not: ["dislike", "unfollow"],
  },
  "instagram:seguidores:br": {
    any: [["instagram", "follow"], ["instagram", "seguidor"]],
    not: ["dislike", "unfollow"],
  },
  "instagram:curtidas": {
    any: [["instagram", "like"], ["instagram", "curtida"]],
    not: ["dislike"],
  },
  "instagram:visualizacoes": {
    any: [["instagram", "view"], ["instagram", "visualiz"]],
    not: ["story", "reel view bot"],
  },
  "facebook:seguidores": {
    any: [["facebook", "follow"], ["facebook", "seguidor"], ["facebook", "page like"]],
  },
  "facebook:curtidas": {
    any: [["facebook", "like"], ["facebook", "curtida"]],
    not: ["page like", "dislike"],
  },
  "youtube:inscritos": {
    any: [["youtube", "subscriber"], ["youtube", "inscrito"]],
  },
  "youtube:visualizacoes": {
    any: [["youtube", "view"], ["youtube", "visualiz"], ["youtube", "watch"]],
    not: ["shorts"],
  },
  "tiktok:seguidores": {
    any: [["tiktok", "follow"], ["tiktok", "seguidor"]],
  },
  "tiktok:seguidores:br": {
    any: [["tiktok", "follow"], ["tiktok", "seguidor"]],
    must: [],
  },
  "tiktok:curtidas": {
    any: [["tiktok", "like"], ["tiktok", "curtida"]],
    not: ["dislike"],
  },
  "tiktok:visualizacoes": {
    any: [["tiktok", "view"], ["tiktok", "visualiz"]],
  },
  "kwai:seguidores": {
    any: [["kwai", "follow"], ["kwai", "seguidor"]],
  },
  "kwai:curtidas": {
    any: [["kwai", "like"], ["kwai", "curtida"]],
    not: ["dislike"],
  },
  "kwai:visualizacoes": {
    any: [["kwai", "view"], ["kwai", "visualiz"]],
  },
  "telegram:canal": {
    any: [["telegram", "channel"], ["telegram", "canal"], ["telegram", "member"]],
    not: ["group", "grupo"],
  },
  "telegram:grupo": {
    any: [["telegram", "group"], ["telegram", "grupo"]],
    not: ["channel", "canal"],
  },
};


function pacoteWantsBrazilian(pacote: string, category: string): boolean {
  if (category.endsWith(":br")) return true;
  // pacotes que começam com "br", "kwai" (Kwai é BR por padrão no nosso catálogo),
  // "wbr" (WhatsApp BR), etc. Kwai + Brasil sempre.
  if (category.startsWith("kwai:")) return true;
  if (/^(br|wbr|kf|kl|kv)/.test(pacote)) return true;
  return false;
}

function pacoteWantsRefill(pacote: string): boolean {
  // Nossos pacotes principais assumem sem-queda (refill). Só pacotes explicitamente
  // "cheap" ou de teste ignoram — hoje não temos, então default = true.
  return true;
}

const BR_HINTS = ["brasil", "brazil", "brasileir", "🇧🇷", "portug"];
const NON_BR_HINTS = ["indian", "arab", "nigerian", "african", "turkish", "russian", "spanish", "european", "chinese", "korean", "japanese", "vietnam", "🇮🇳", "🇸🇦", "🇳🇬", "🇹🇷", "🇷🇺", "🇪🇸", "🇪🇺"];

function scoreCandidate(row: CacheRow, opts: { qty: number; wantBr: boolean; wantRefill: boolean; matcher: typeof CATEGORY_MATCHERS[string] }): number | null {
  const hay = `${row.name} ${row.category}`.toLowerCase();

  // Filtro de categoria — ao menos 1 combinação "any" precisa bater todas suas palavras.
  const catOk = opts.matcher.any.some((words) => words.every((w) => hay.includes(w)));
  if (!catOk) return null;

  // Palavras proibidas.
  if (opts.matcher.not?.some((w) => hay.includes(w))) return null;

  // Quantidade cabe?
  if (!(row.min <= opts.qty && opts.qty <= row.max)) return null;

  // v187 — refill é PREFERÊNCIA, não filtro. Rejeitar por refill=false deixava Kwai
  // 100% órfão no Verified (todos os serviços Kwai lá são sem-refill). Melhor ter
  // fallback sem-refill do que pedido travado quando primário cai.

  // BR: se pacote é BR, o serviço PRECISA ter hint BR e não pode ter hint estrangeiro.
  // Se pacote NÃO é BR, prefere sem hint estrangeiro (mas aceita).
  const hasBr = BR_HINTS.some((h) => hay.includes(h));
  const hasForeign = NON_BR_HINTS.some((h) => hay.includes(h));
  if (opts.wantBr) {
    if (!hasBr) return null;
    if (hasForeign) return null;
  } else {
    if (hasForeign && !hasBr) {
      // aceita mas penaliza pesado — provavelmente não é o que queremos
      return row.rate * 10;
    }
  }

  // Score = rate (menor = melhor). Refill dá bônus; sem-refill leva penalidade leve
  // pra ficar atrás de opções com refill, mas ainda elegível como fallback.
  let score = row.rate;
  if (row.refill === true) score *= 0.98;
  else if (row.refill === false && opts.wantRefill) score *= 1.5;
  return score;
}

async function loadCache(supabaseAdmin: any, provider: Provider): Promise<CacheRow[]> {
  const table = provider === "smmhype" ? "services_cache" : provider === "smmpanel" ? "smmpanel_services_cache" : "verified_services_cache";
  const { data } = await supabaseAdmin
    .from(table)
    .select("provider_service_id, name, category, rate, min, max, refill");
  return ((data as any[]) ?? []).map((r) => ({
    provider_service_id: String(r.provider_service_id),
    name: String(r.name ?? ""),
    category: String(r.category ?? ""),
    rate: Number(r.rate) || 0,
    min: Number(r.min) || 0,
    max: Number(r.max) || 0,
    refill: r.refill == null ? null : Boolean(r.refill),
  }));
}

function pickBest(cache: CacheRow[], item: PricingItem): string | null {
  const matcher = CATEGORY_MATCHERS[item.category];
  if (!matcher) return null;
  const wantBr = pacoteWantsBrazilian(item.pacote, item.category);
  const wantRefill = pacoteWantsRefill(item.pacote);
  let best: { id: string; score: number } | null = null;
  for (const row of cache) {
    const s = scoreCandidate(row, { qty: item.quantidade, wantBr, wantRefill, matcher });
    if (s == null) continue;
    if (!best || s < best.score) best = { id: row.provider_service_id, score: s };
  }
  return best?.id ?? null;
}

export type AutoResolveResult = {
  provider: Provider;
  filled: number;
  skipped_no_match: string[];
  skipped_already_manual: number;
};

export async function autoResolveAll(): Promise<AutoResolveResult[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: itemsData }, hypeCache, painelCache, verifiedCache] = await Promise.all([
    supabaseAdmin.from("pricing_items" as any).select(
      "pacote, category, quantidade, smmhype_service_id, smmpanel_service_id, verified_service_id, smmhype_auto_id, smmpanel_auto_id, verified_auto_id",
    ),
    loadCache(supabaseAdmin, "smmhype"),
    loadCache(supabaseAdmin, "smmpanel"),
    loadCache(supabaseAdmin, "verified"),
  ]);

  const items = (itemsData as any[]) ?? [];
  const providers: Array<{ p: Provider; cache: CacheRow[]; manualCol: keyof PricingItem; autoCol: keyof PricingItem }> = [
    { p: "smmhype", cache: hypeCache, manualCol: "smmhype_service_id", autoCol: "smmhype_auto_id" },
    { p: "smmpanel", cache: painelCache, manualCol: "smmpanel_service_id", autoCol: "smmpanel_auto_id" },
    { p: "verified", cache: verifiedCache, manualCol: "verified_service_id", autoCol: "verified_auto_id" },
  ];

  const results: AutoResolveResult[] = [];
  const failuresToAlert: Array<{ pacote: string; provider: Provider; count: number }> = [];

  for (const { p, cache, manualCol, autoCol } of providers) {
    const updates: Array<{ pacote: string; auto_id: string | null }> = [];
    let alreadyManual = 0;
    const noMatch: string[] = [];

    for (const it of items as PricingItem[]) {
      if (it[manualCol]) { alreadyManual++; continue; }
      const chosen = pickBest(cache, it);
      if (!chosen) {
        noMatch.push(it.pacote);
        if (it[autoCol]) updates.push({ pacote: it.pacote, auto_id: null });
        continue;
      }
      if (chosen !== it[autoCol]) {
        updates.push({ pacote: it.pacote, auto_id: chosen });
      }
    }

    for (const u of updates) {
      await supabaseAdmin
        .from("pricing_items" as any)
        .update({ [autoCol]: u.auto_id, auto_resolved_at: new Date().toISOString() } as any)
        .eq("pacote", u.pacote);
    }

    // Sucesso: limpa registro de falha para pacotes que resolveram.
    const succeeded = (items as PricingItem[])
      .filter((it) => !it[manualCol] && !noMatch.includes(it.pacote))
      .map((it) => it.pacote);
    if (succeeded.length > 0) {
      await supabaseAdmin
        .from("auto_resolver_failures" as any)
        .delete()
        .eq("provider", p)
        .in("pacote", succeeded);
    }

    // Falha: incrementa contador.
    for (const pacote of noMatch) {
      const { data: existing } = await supabaseAdmin
        .from("auto_resolver_failures" as any)
        .select("fail_count, last_alerted_at")
        .eq("pacote", pacote)
        .eq("provider", p)
        .maybeSingle();
      const prev = (existing as any) ?? { fail_count: 0, last_alerted_at: null };
      const newCount = (prev.fail_count ?? 0) + 1;
      const nowIso = new Date().toISOString();
      await supabaseAdmin.from("auto_resolver_failures" as any).upsert({
        pacote,
        provider: p,
        fail_count: newCount,
        last_failed_at: nowIso,
        first_failed_at: prev.fail_count ? undefined : nowIso,
      } as any, { onConflict: "pacote,provider" } as any);

      const alertedRecently = prev.last_alerted_at &&
        (Date.now() - new Date(prev.last_alerted_at).getTime()) < 24 * 60 * 60 * 1000;
      if (newCount >= 3 && !alertedRecently) {
        failuresToAlert.push({ pacote, provider: p, count: newCount });
        await supabaseAdmin
          .from("auto_resolver_failures" as any)
          .update({ last_alerted_at: nowIso } as any)
          .eq("pacote", pacote)
          .eq("provider", p);
      }
    }

    results.push({
      provider: p,
      filled: updates.filter((u) => u.auto_id != null).length,
      skipped_no_match: noMatch,
      skipped_already_manual: alreadyManual,
    });
  }

  // Dispara UM alerta agregado por rodada.
  if (failuresToAlert.length > 0) {
    try {
      const { dispatchTelegramAlert } = await import("./messaging");
      const linhas = failuresToAlert
        .slice(0, 15)
        .map((f) => `• ${f.pacote} (${f.provider}) — ${f.count}x seguidas`)
        .join("\n");
      const extra = failuresToAlert.length > 15 ? `\n…e mais ${failuresToAlert.length - 15}` : "";
      const msg =
        `⚠️ PACOTE SEM FORNECEDOR AUTOMÁTICO\n\n` +
        `PROBLEMA: o robô tentou 3+ vezes e não achou serviço equivalente para:\n${linhas}${extra}\n\n` +
        `O QUE FAZER: abrir Admin → Expansão do Catálogo e vincular o ID manualmente, ou revisar filtros de categoria.`;
      await dispatchTelegramAlert(msg);
    } catch (e) {
      console.error("[auto-resolver] falha ao enviar alerta Telegram", e);
    }
  }

  return results;
}
