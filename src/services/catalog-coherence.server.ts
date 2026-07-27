// v291 — Carrega catálogo + nomes de serviço dos caches e roda as invariantes.
// Zero HTTP externo: só banco. Seguro para rodar junto da auditoria forense.
import {
  analyzeCatalogCoherence,
  serviceKey,
  type CoherenceIssue,
  type CoherenceRow,
} from "@/lib/catalog-coherence";

// v308 — cada coluna de ID sabe de qual fornecedor ela é. Antes o nome era
// buscado por id "solto" e o mesmo número existia em fornecedores diferentes
// com produtos diferentes — a auditoria lia o nome errado e pausava pacote bom.
const ID_COLUMNS: Array<{ col: string; provider: string }> = [
  { col: "smmhype_service_id", provider: "smmhype" },
  { col: "smmhype_auto_id", provider: "smmhype" },
  { col: "provider_service_id", provider: "smmhype" },
  { col: "smmpanel_service_id", provider: "smmpanel" },
  { col: "smmpanel_auto_id", provider: "smmpanel" },
  { col: "verified_service_id", provider: "verified" },
  { col: "verified_auto_id", provider: "verified" },
  { col: "provider4_service_id", provider: "provider4" },
  { col: "provider4_auto_id", provider: "provider4" },
];

const CACHE_TABLES: Array<{ table: string; provider: string }> = [
  { table: "services_cache", provider: "smmhype" },
  { table: "smmpanel_services_cache", provider: "smmpanel" },
  { table: "verified_services_cache", provider: "verified" },
  { table: "provider4_services_cache", provider: "provider4" },
];

export async function runCatalogCoherence(): Promise<CoherenceIssue[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: items } = await supabaseAdmin
    .from("pricing_items" as any)
    .select(
      ["pacote", "category", "quantidade", "cost_brl", "price_brl", "last_dry_run", ...ID_COLUMNS.map((c) => c.col)].join(", "),
    );

  const rows: CoherenceRow[] = ((items as any[]) ?? []).map((r) => {
    const seen = new Set<string>();
    const serviceIds = ID_COLUMNS.flatMap(({ col, provider }) => {
      const v = r[col];
      if (v === null || v === undefined || String(v).trim() === "") return [];
      const ref = { provider, id: String(v).trim() };
      const k = serviceKey(ref);
      if (seen.has(k)) return [];
      seen.add(k);
      return [ref];
    });
    return {
      pacote: String(r.pacote),
      category: r.category ?? null,
      quantidade: r.quantidade ?? null,
      cost_brl: r.cost_brl ?? null,
      price_brl: r.price_brl ?? null,
      last_dry_run: r.last_dry_run ?? null,
      serviceIds,
    };
  });

  const serviceNames = new Map<string, string>();
  await Promise.all(
    CACHE_TABLES.map(async ({ table, provider }) => {
      try {
        const { data } = await supabaseAdmin
          .from(table as any)
          .select("provider_service_id, name");
        for (const s of ((data as any[]) ?? [])) {
          const id = String(s.provider_service_id ?? "").trim();
          if (id && s.name) serviceNames.set(serviceKey({ provider, id }), String(s.name));
        }
      } catch { /* cache ausente não invalida a auditoria */ }
    }),
  );

  return analyzeCatalogCoherence(rows, serviceNames);
}


// v304 — A auditoria de coerência deixou de ser só relatório.
// Serviço errado vinculado (SERVICO_INCOERENTE) e custo absurdo
// (CUSTO_FORA_DA_CURVA) são falhas que só terminam em estorno: o pacote sai da
// vitrine na hora e o dono decide depois. Não religa sozinho — o motivo usa
// prefixo próprio, então o auto-religamento por custo (v267) não toca nele.
const AUTO_PAUSE_CODES = new Set(["SERVICO_INCOERENTE", "CUSTO_FORA_DA_CURVA"]);
const PAUSE_PREFIX = "auditoria de coerência";

export async function remediateCoherence(
  issues: CoherenceIssue[],
): Promise<{ paused: string[]; errors: number }> {
  const alvos = new Map<string, string>();
  for (const i of issues) {
    if (!AUTO_PAUSE_CODES.has(i.code)) continue;
    if (!alvos.has(i.pacote)) alvos.set(i.pacote, `${PAUSE_PREFIX}: ${i.detalhe}`);
  }
  if (alvos.size === 0) return { paused: [], errors: 0 };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paused: string[] = [];
  let errors = 0;

  for (const [pacote, motivo] of alvos) {
    const { error, data } = await supabaseAdmin
      .from("pricing_items" as any)
      .update({ is_sellable: false, sellable_reason: motivo.slice(0, 400) })
      .eq("pacote", pacote)
      .neq("is_sellable", false)
      .select("pacote");
    if (error) {
      errors += 1;
      console.error("[coerencia] v304 auto-pausa falhou", { pacote, error: error.message });
      continue;
    }
    if ((data as any[])?.length) paused.push(pacote);
  }

  if (paused.length > 0) {
    console.warn(`[coerencia] v304 pausou ${paused.length} pacote(s) incoerente(s):`, paused.join(", "));
  }
  return { paused, errors };
}

