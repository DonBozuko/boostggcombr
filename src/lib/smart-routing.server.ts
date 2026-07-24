// Smart Cost Routing + Provider Health (Turno B v58)
// Calcula custo BRL real por fornecedor ativo e ordena ascendente.
// Sentinela: marca fornecedor instável por 30min após falha em runtime.

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
      .select("slug, nome, ativo, saldo_atual, cotacao_brl, prioridade")
      .eq("ativo", true),
    serviceId != null
      ? supabaseAdmin.from("services_cache").select("rate").eq("provider_service_id", serviceId).maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabaseAdmin.from("provider_health" as any).select("slug, unstable_until"),
    getPricingRow(opts.pacote),
    supabaseAdmin.from("pricing_items" as any).select("smmhype_auto_id, smmpanel_auto_id, verified_auto_id").eq("pacote", opts.pacote).maybeSingle(),
  ]);

  // Failover triplo: ID manual (curado) tem prioridade, cai no auto-resolvido.
  const providerIdMap: Record<string, string | null> = {
    smmhype: (pricingItem as any)?.smmhype_service_id ?? (autoIds as any)?.smmhype_auto_id ?? (serviceId != null ? String(serviceId) : null),
    smmpainel: (pricingItem as any)?.smmpanel_service_id ?? (autoIds as any)?.smmpanel_auto_id ?? null,
    verified: (pricingItem as any)?.verified_service_id ?? (autoIds as any)?.verified_auto_id ?? null,
  };

  // v241 — TRAVA BR EM RUNTIME (caso Sybele).
  // O dry-run valida o catálogo curado, mas o failover podia cair num
  // *_auto_id internacional/tóxico e entregar seguidor árabe num pacote :br.
  // Aqui, antes de rankear, derrubo qualquer fornecedor cujo serviço não seja
  // brasileiro de verdade (ou esteja marcado como queda pelo próprio fornecedor).
  try {
    const { data: catRow } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("category")
      .eq("pacote", opts.pacote)
      .maybeSingle();
    const category = String((catRow as any)?.category ?? "");
    const TOXIC_RE = /n[aã]o\s*compre|queda\s*de\s*100|100%\s*de?\s*queda|drop\s*100/i;
    const BR_RE = /brasil|brazil|brasileir|🇧🇷/i;
    const needsBr = category.endsWith(":br") || opts.pacote.startsWith("br-") || opts.pacote.startsWith("wbr");
    const cacheTable: Record<string, string> = {
      smmhype: "smmhype_services_cache",
      smmpainel: "smmpanel_services_cache",
      verified: "verified_services_cache",
    };
    for (const slug of Object.keys(providerIdMap)) {
      const pid = providerIdMap[slug];
      if (!pid) continue;
      const { data: svcRow } = await supabaseAdmin
        .from(cacheTable[slug] as any)
        .select("name, category")
        .eq("provider_service_id", String(pid))
        .maybeSingle();
      if (!svcRow) continue; // sem catálogo em cache: não bloqueio (evita parar venda)
      const hay = `${(svcRow as any).name ?? ""} ${(svcRow as any).category ?? ""}`;
      if (TOXIC_RE.test(hay) || (needsBr && !BR_RE.test(hay))) {
        providerIdMap[slug] = null;
        console.warn(`[v241] ${slug} descartado p/ ${opts.pacote}: serviço ${pid} não é BR válido`);
      }
    }
  } catch { /* noop — nunca derrubar o dispatch por causa da trava */ }



  const smmhypeRate = Number((svc as any)?.rate);
  const [smmpainelRate, verifiedRate] = await Promise.all([
    fetchServiceRate("smmpainel", "https://smmpainel.com/api/v2", process.env.SMMPAINEL_API_KEY, providerIdMap.smmpainel),
    fetchServiceRate("verified", "https://verifiedatacado.com/api/v2", process.env.VERIFIED_API_KEY, providerIdMap.verified),
  ]);
  const providerRateMap: Record<string, number | null> = {
    smmhype: Number.isFinite(smmhypeRate) && smmhypeRate > 0 ? smmhypeRate : null,
    smmpainel: smmpainelRate,
    verified: verifiedRate,
  };
  const healthMap = new Map<string, string | null>();
  ((health as any[]) ?? []).forEach((h) => healthMap.set(h.slug, h.unstable_until));

  const now = Date.now();
  const ranked: RankedProvider[] = ((forn as any[]) ?? []).map((f) => {
    const cot = Number(f.cotacao_brl ?? 7.0) || 7.0;
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
  }).filter((p) => !!p.provider_service_id);

  // v168 — Strict Margin Guard: ordena por MENOR custo real (Math.min sobre cost_brl).
  // Cascata canônica (smmhype → smmpanel → verified) vira APENAS desempate quando
  // cost_brl é matematicamente idêntico. Instáveis vão pro final.
  const cascadeOrder: Record<string, number> = { smmhype: 0, smmpainel: 1, verified: 2 };
  ranked.sort((a, b) => {
    if (a.unstable !== b.unstable) return a.unstable ? 1 : -1;
    const ac = a.cost_brl ?? Number.POSITIVE_INFINITY;
    const bc = b.cost_brl ?? Number.POSITIVE_INFINITY;
    if (ac !== bc) return ac - bc;
    const ao = cascadeOrder[a.slug] ?? 99;
    const bo = cascadeOrder[b.slug] ?? 99;
    return ao - bo;
  });

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
