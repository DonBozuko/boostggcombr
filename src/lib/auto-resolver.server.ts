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
const CATEGORY_MATCHERS: Record<string, { any: string[][]; must?: string[]; not?: string[] }> = {
  "instagram:seguidores": {
    any: [["instagram", "follow"], ["instagram", "seguidor"]],
    not: ["dislike", "unfollow"],
  },
  "instagram:curtidas": {
    any: [["instagram", "like"], ["instagram", "curtida"]],
    not: ["dislike"],
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

  // Refill obrigatório quando pedido.
  if (opts.wantRefill && row.refill === false) return null;

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

  // Score = rate (menor = melhor). Refill dá pequeno bônus.
  let score = row.rate;
  if (row.refill) score *= 0.98;
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

  for (const { p, cache, manualCol, autoCol } of providers) {
    const updates: Array<{ pacote: string; auto_id: string | null }> = [];
    let alreadyManual = 0;
    const noMatch: string[] = [];

    for (const it of items as PricingItem[]) {
      if (it[manualCol]) { alreadyManual++; continue; }
      const chosen = pickBest(cache, it);
      if (!chosen) {
        noMatch.push(it.pacote);
        // limpa auto antigo se não achou mais nada
        if (it[autoCol]) updates.push({ pacote: it.pacote, auto_id: null });
        continue;
      }
      if (chosen !== it[autoCol]) {
        updates.push({ pacote: it.pacote, auto_id: chosen });
      }
    }

    // Executa updates em batch.
    for (const u of updates) {
      await supabaseAdmin
        .from("pricing_items" as any)
        .update({ [autoCol]: u.auto_id, auto_resolved_at: new Date().toISOString() } as any)
        .eq("pacote", u.pacote);
    }

    results.push({
      provider: p,
      filled: updates.filter((u) => u.auto_id != null).length,
      skipped_no_match: noMatch,
      skipped_already_manual: alreadyManual,
    });
  }

  return results;
}
