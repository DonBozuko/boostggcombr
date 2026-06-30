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
  rate_usd: number | null;
  unstable: boolean;
};

export async function rankProvidersByCost(opts: {
  pacote: string;
  quantidade: number;
}): Promise<RankedProvider[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { resolveServiceIdAsync } = await import("./smmhype.server");

  const serviceId = await resolveServiceIdAsync(opts.pacote, opts.quantidade);

  const [{ data: forn }, { data: svc }, { data: health }] = await Promise.all([
    supabaseAdmin
      .from("fornecedores")
      .select("slug, nome, ativo, saldo_atual, cotacao_brl, prioridade")
      .eq("ativo", true)
      .gt("saldo_atual", 0),
    serviceId != null
      ? supabaseAdmin.from("services_cache").select("rate").eq("provider_service_id", serviceId).maybeSingle()
      : Promise.resolve({ data: null } as any),
    supabaseAdmin.from("provider_health" as any).select("slug, unstable_until"),
  ]);

  const rate = Number((svc as any)?.rate);
  const healthMap = new Map<string, string | null>();
  ((health as any[]) ?? []).forEach((h) => healthMap.set(h.slug, h.unstable_until));

  const now = Date.now();
  const ranked: RankedProvider[] = ((forn as any[]) ?? []).map((f) => {
    const cot = Number(f.cotacao_brl ?? 7.0) || 7.0;
    const cost = Number.isFinite(rate) && rate > 0
      ? Number(((opts.quantidade / 1000) * rate * cot).toFixed(4))
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
      rate_usd: Number.isFinite(rate) ? rate : null,
      unstable,
    };
  });

  // Ordem: estáveis primeiro; depois menor custo (null vai pro fim); depois prioridade
  ranked.sort((a, b) => {
    if (a.unstable !== b.unstable) return a.unstable ? 1 : -1;
    const ac = a.cost_brl ?? Number.POSITIVE_INFINITY;
    const bc = b.cost_brl ?? Number.POSITIVE_INFINITY;
    if (ac !== bc) return ac - bc;
    return 0;
  });

  return ranked;
}

export async function markProviderUnstable(slug: string, errorMsg: string): Promise<void> {
  // v67 — Perpetual Balance Force: nunca marcar unstable se o fornecedor
  // possui saldo real ativo. O failover é em runtime, sem desativar botões.
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: f } = await supabaseAdmin
      .from("fornecedores")
      .select("saldo_atual, ativo")
      .eq("slug", slug)
      .maybeSingle();
    if (f && (f as any).ativo && Number((f as any).saldo_atual) > 0) {
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
      severity: "warning",
      source: "smart-routing",
      message: `Fornecedor ${slug} marcado _unstable por 30min: ${errorMsg.slice(0, 200)}`,
      payload: { slug, error: errorMsg.slice(0, 300) },
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
