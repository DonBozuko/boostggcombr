// Smart Cost Routing + Provider Health (Turno B v58)
// Calcula custo BRL real por fornecedor ativo e ordena ascendente.
// Sentinela: marca fornecedor instável por 30min após falha em runtime.
import { costIsSane } from "./cost-sanity";

const UNSTABLE_TTL_MS = 30 * 60 * 1000;


export type RankedProvider = {
  slug: string;
  nome: string;
  cotacao_brl: number;
  saldo_atual: number;
  cost_brl: number | null; // null = sem rate conhecido → fica no final
  service_id: number | null;
  provider_service_id: string | null; // v85 — ID específico do fornecedor p/ este pacote
  rate_usd: number | null;
  unstable: boolean;
};

const RATE_TTL_MS = 60_000; // v163 — TTL rígido de 60s p/ rates dos 3 fornecedores

type ServiceRate = { service: number | string; rate: number | string };

async function fetchServiceRateLive(endpoint: string, apiKey: string, serviceId: string): Promise<number | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json,text/plain,*/*",
          "User-Agent": "EliteBoostPrime-Routing/163",
        },
        body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }
    if (!res.ok) return null;
    const parsed = JSON.parse(await res.text()) as ServiceRate[];
    if (!Array.isArray(parsed)) return null;
    const hit = parsed.find((s) => String(s.service) === String(serviceId));
    const rate = Number(hit?.rate);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch { return null; }
}

// v163 — Cache read-through com TTL 60s por (slug,service_id).
// Só bate HTTP externo se o registro daquele SKU estourou 60s. Se HTTP falha e há cache stale, serve o stale.
async function fetchServiceRate(
  slug: string,
  endpoint: string,
  apiKey: string | undefined,
  serviceId: string | null,
): Promise<number | null> {
  if (!apiKey || !serviceId) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: cached } = await supabaseAdmin
    .from("provider_rates_cache" as any)
    .select("rate_usd, updated_at")
    .eq("provider_slug", slug)
    .eq("provider_service_id", String(serviceId))
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date((cached as any).updated_at).getTime();
    if (age < RATE_TTL_MS) {
      const r = Number((cached as any).rate_usd);
      return Number.isFinite(r) && r > 0 ? r : null;
    }
  }

  const live = await fetchServiceRateLive(endpoint, apiKey, serviceId);
  if (live != null) {
    await supabaseAdmin.from("provider_rates_cache" as any).upsert(
      { provider_slug: slug, provider_service_id: String(serviceId), rate_usd: live, updated_at: new Date().toISOString() } as any,
      { onConflict: "provider_slug,provider_service_id" },
    );
    return live;
  }
  if (cached) {
    const r = Number((cached as any).rate_usd);
    return Number.isFinite(r) && r > 0 ? r : null;
  }
  return null;
}

export async function rankProvidersByCost(opts: {
  pacote: string;
  quantidade: number;
}): Promise<RankedProvider[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { resolveServiceIdAsync } = await import("./smmhype.server");
  const { getPricingRow, ensureReserveProviderIdsFresh } = await import("./pricing-cache.server");

  await ensureReserveProviderIdsFresh();

  const serviceId = await resolveServiceIdAsync(opts.pacote, opts.quantidade);

  const [{ data: forn }, { data: svc }, { data: health }, pricingItem, { data: autoIds }] = await Promise.all([
    supabaseAdmin
      .from("fornecedores")
      .select("slug, nome, ativo, saldo_atual, cotacao_brl, prioridade, api_url, api_key_secret")
      .eq("ativo", true),
    serviceId != null
      ? supabaseAdmin.from("services_cache").select("rate").eq("provider_service_id", serviceId).maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabaseAdmin.from("provider_health" as any).select("slug, unstable_until"),
    getPricingRow(opts.pacote),
    supabaseAdmin.from("pricing_items" as any).select("smmhype_auto_id, smmpanel_auto_id, verified_auto_id, provider4_auto_id").eq("pacote", opts.pacote).maybeSingle(),
  ]);

  // v245 — Failover genérico: para cada fornecedor ativo, descobre o ID curado
  // (coluna <slug>_service_id) ou auto-resolvido (<slug>_auto_id). SMMhype mantém
  // fallback pelo service_id primário para compatibilidade histórica.
  // Alias: banco usa slug 'smmpainel' mas coluna 'smmpanel_*'.
  const slugToColumn: Record<string, string> = {
    smmhype: "smmhype",
    smmpainel: "smmpanel",
    smmpanel: "smmpanel",
    verified: "verified",
    provider4: "provider4",
  };
  const slugs = ((forn as any[]) ?? []).map((f) => f.slug as string);
  const providerIdMap: Record<string, string | null> = {};
  // v294 — precisamos saber se o ID veio curado (manual) ou auto-resolvido.
  const providerIdIsAuto: Record<string, boolean> = {};
  // v313 — de qual coluna veio o ID (chave da impressão digital do serviço).
  const providerIdCol: Record<string, string> = {};
  for (const slug of slugs) {
    const prefix = slugToColumn[slug] ?? slug;
    const manualCol = `${prefix}_service_id`;
    const autoCol = `${prefix}_auto_id`;
    const manualId = (pricingItem as any)?.[manualCol] ?? null;
    const autoId = (autoIds as any)?.[autoCol] ?? null;
    const fallbackId = slug === "smmhype" && serviceId != null ? String(serviceId) : null;
    providerIdMap[slug] = manualId ?? autoId ?? fallbackId;
    providerIdIsAuto[slug] = manualId == null && autoId != null;
    providerIdCol[slug] = manualId != null ? manualCol : autoId != null ? autoCol : `${prefix}_service_id`;
  }


  // v241/v242/v245 — TRAVA BR EM RUNTIME + PREFERÊNCIA POR GARANTIA (caso Sybele).
  const refillMap: Record<string, boolean> = {};
  let brPackage = false;
  try {
    const { isBrPackage, providerCanServe } = await import("./critical-guards");
    const { data: catRow } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("category")
      .eq("pacote", opts.pacote)
      .maybeSingle();
    brPackage = isBrPackage(opts.pacote, (catRow as any)?.category);
    const cacheTable: Record<string, string> = {
      smmhype: "smmhype_services_cache",
      smmpainel: "smmpanel_services_cache",
      smmpanel: "smmpanel_services_cache",
      verified: "verified_services_cache",
      provider4: "provider4_services_cache",
    };
    for (const slug of Object.keys(providerIdMap)) {
      const pid = providerIdMap[slug];
      if (!pid) continue;
      const table = cacheTable[slug];
      if (!table) continue;
      const { data: svcRow } = await supabaseAdmin
        .from(table as any)
        .select("name, category, refill, min, max")
        .eq("provider_service_id", String(pid))
        .maybeSingle();
      if (!svcRow) {
        // v296 — TRAVA DE ID FANTASMA. Se o catálogo do fornecedor está
        // carregado e o ID do pacote não está lá, esse ID não existe mais.
        // Mandar mesmo assim = pedido recusado + reembolso (caso p15k/14225).
        // Só ignoramos quando o cache daquele fornecedor está vazio (sem dado).
        const { count: catalogoSize } = await supabaseAdmin
          .from(table as any)
          .select("provider_service_id", { count: "exact", head: true });
        if ((catalogoSize ?? 0) === 0) continue; // sem catálogo: não bloqueia
        providerIdMap[slug] = null;
        console.error(`[v296] ${slug} descartado p/ ${opts.pacote}: serviço ${pid} não existe mais no catálogo do fornecedor`);
        const prefix = slugToColumn[slug] ?? slug;
        // ID auto inexistente: zera para o auto-resolver procurar outro.
        if (((autoIds as any)?.[`${prefix}_auto_id`] ?? null) != null && ((pricingItem as any)?.[`${prefix}_service_id`] ?? null) == null) {
          void supabaseAdmin.from("pricing_items" as any).update({ [`${prefix}_auto_id`]: null } as any).eq("pacote", opts.pacote);
        }
        continue;
      }

      refillMap[slug] = (svcRow as any).refill === true;
      // v286 — TRAVA DE FAIXA: fornecedor que não aceita a quantidade do pacote
      // é descartado ANTES do dispatch. Antes disso o pedido só falhava no
      // fornecedor ("min_quantity" / recusa genérica) e gerava alerta falso.
      const fmin = Number((svcRow as any).min) || 0;
      const fmax = Number((svcRow as any).max) || 0;
      if ((fmin > 0 && opts.quantidade < fmin) || (fmax > 0 && opts.quantidade > fmax)) {
        providerIdMap[slug] = null;
        console.warn(`[v286] ${slug} descartado p/ ${opts.pacote}: serviço ${pid} aceita ${fmin}-${fmax}, pedido ${opts.quantidade}`);
        // ID auto fora de faixa está errado: zera para o auto-resolver escolher outro.
        const prefix = slugToColumn[slug] ?? slug;
        if (((autoIds as any)?.[`${prefix}_auto_id`] ?? null) != null && ((pricingItem as any)?.[`${prefix}_service_id`] ?? null) == null) {
          void supabaseAdmin.from("pricing_items" as any).update({ [`${prefix}_auto_id`]: null } as any).eq("pacote", opts.pacote);
        }
        continue;
      }
      if (!providerCanServe({ brPackage, svc: svcRow as any, requireRefill: brPackage })) {
        providerIdMap[slug] = null;
        const reason = brPackage && (svcRow as any).refill !== true ? "sem refill garantido" : "não é BR válido";
        console.warn(`[v245] ${slug} descartado p/ ${opts.pacote}: serviço ${pid} ${reason}`);
      }

    }
    if (brPackage && Object.values(providerIdMap).every((v) => !v)) {
      console.error(`[v245] ${opts.pacote}: nenhum fornecedor BR com refill válido. Venda bloqueada.`);
      return [];
    }
  } catch { /* noop — nunca derrubar o dispatch por causa da trava */ }

  // Busca rates de todos os fornecedores ativos em paralelo.
  const providerRateMap: Record<string, number | null> = {};
  const smmhypeRate = Number((svc as any)?.rate);
  providerRateMap["smmhype"] = Number.isFinite(smmhypeRate) && smmhypeRate > 0 ? smmhypeRate : null;

  await Promise.all(
    slugs
      .filter((slug) => slug !== "smmhype")
      .map(async (slug) => {
        const f = (forn as any[]).find((x) => x.slug === slug);
        if (!f) return;
        const apiKey = process.env[f.api_key_secret];
        providerRateMap[slug] = await fetchServiceRate(slug, f.api_url, apiKey, providerIdMap[slug]);
      }),
  );

  const healthMap = new Map<string, string | null>();
  ((health as any[]) ?? []).forEach((h) => healthMap.set(h.slug, h.unstable_until));

  const now = Date.now();
  const { effectiveFx } = await import("./critical-guards");
  const ranked: RankedProvider[] = ((forn as any[]) ?? []).map((f) => {
    const cotRaw = Number(f.cotacao_brl ?? 7.0) || 7.0;
    // v246 — painéis BR cobram em BRL: não multiplicar pela cotação USD.
    const cot = effectiveFx(f.slug, cotRaw);
    const providerRate = providerRateMap[f.slug] ?? null;
    const cost = providerRate != null
      ? Number(((opts.quantidade / 1000) * providerRate * cot).toFixed(4))
      : null;
    const until = healthMap.get(f.slug);
    const unstable = !!(until && new Date(until).getTime() > now);
    return {
      slug: f.slug,
      nome: f.nome,
      cotacao_brl: cot,
      saldo_atual: Number(f.saldo_atual),
      cost_brl: cost,
      service_id: serviceId,
      provider_service_id: providerIdMap[f.slug] ?? null,
      rate_usd: providerRate,
      unstable,
    };
  }).filter((p) => !!p.provider_service_id)
    // v294 — descarta ID AUTO cujo custo destoa do custo de referência do pacote:
    // sinal quase certo de que o ID aponta para outro produto (yv1k a R$0,20).
    .filter((p) => {
      if (!providerIdIsAuto[p.slug]) return true;
      const ref = Number((pricingItem as any)?.cost_brl);
      if (costIsSane(p.cost_brl, ref)) return true;
      console.error(
        `[v294] ${p.slug} descartado p/ ${opts.pacote}: ID auto ${p.provider_service_id} custa R$${p.cost_brl} vs referência R$${ref}`,
      );
      const prefix = slugToColumn[p.slug] ?? p.slug;
      // Zera o ID auto errado para o auto-resolver procurar outro na próxima volta.
      void supabaseAdmin
        .from("pricing_items" as any)
        .update({ [`${prefix}_auto_id`]: null } as any)
        .eq("pacote", opts.pacote);
      return false;
    });


  const cascadeOrder: Record<string, number> = Object.fromEntries(slugs.map((s, i) => [s, i]));
  const { compareProviders } = await import("./critical-guards");
  ranked.sort((a, b) => compareProviders(a, b, { brPackage, refillMap, cascadeOrder }));

  return ranked;
}

/**
 * v164 — Cheapest picker: Math.min sobre fornecedores VÁLIDOS
 * (com provider_service_id específico, não-unstable, saldo>0).
 * Empréstimo síncrono: se o mais barato falhar/instável, cai no próximo mais barato.
 */
export async function pickCheapestFornecedorSlug(pacote: string, quantidade: number): Promise<string | null> {
  const ranked = await rankProvidersByCost({ pacote, quantidade });
  if (!ranked.length) return null;
  const valid = ranked.filter(
    (p) => !p.unstable && p.saldo_atual > 0 && !!p.provider_service_id,
  );
  // v242 — pacote BR respeita a ordem já rankeada (garantia > preço).
  const brPackage = pacote.startsWith("br-") || pacote.startsWith("wbr");
  if (brPackage) {
    if (valid.length) return valid[0].slug;
    return ranked[0].slug;
  }
  const withCost = valid.filter((p) => typeof p.cost_brl === "number" && (p.cost_brl as number) > 0);
  if (withCost.length) {
    const min = Math.min(...withCost.map((p) => p.cost_brl as number));
    return withCost.find((p) => p.cost_brl === min)?.slug ?? withCost[0].slug;
  }
  if (valid.length) return valid[0].slug;
  return ranked[0].slug;
}


export async function markProviderUnstable(slug: string, errorMsg: string): Promise<void> {
  // v67 — Perpetual Balance Force: nunca marcar unstable se o fornecedor
  // possui saldo real ativo. O failover é em runtime, sem desativar botões.
  const confirmedOutage = /verificações automáticas seguidas/i.test(errorMsg);
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: f } = await supabaseAdmin
      .from("fornecedores")
      .select("saldo_atual, ativo")
      .eq("slug", slug)
      .maybeSingle();
    if (!confirmedOutage && f && (f as any).ativo && Number((f as any).saldo_atual) > 0) {
      console.warn(`[smart-routing] ${slug} instável mas mantido ATIVO (saldo>0): ${errorMsg.slice(0,120)}`);
      return;
    }
  } catch { /* noop */ }
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const until = new Date(Date.now() + UNSTABLE_TTL_MS).toISOString();
    await supabaseAdmin.from("provider_health" as any).upsert(
      {
        slug,
        unstable_until: until,
        last_error: errorMsg.slice(0, 300),
        last_failure_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      { onConflict: "slug" },
    );
  } catch (e) {
    console.warn("[smart-routing] markProviderUnstable falhou", e);
  }

  // Alerta amarelo no NOC (jarvis_alerts)
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("jarvis_alerts" as any).insert({
      severidade: "warning",
      origem: "smart-routing",
      mensagem: `Fornecedor ${slug} marcado _unstable por 30min: ${errorMsg.slice(0, 200)}`,
      detalhe: JSON.stringify({ slug, error: errorMsg.slice(0, 300) }).slice(0, 1000),
    } as any);
  } catch { /* ignore */ }
}

export async function clearProviderUnstable(slug: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("provider_health" as any).upsert(
      { slug, unstable_until: null, updated_at: new Date().toISOString() } as any,
      { onConflict: "slug" },
    );
  } catch { /* ignore */ }
}
