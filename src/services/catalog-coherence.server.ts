// v291 — Carrega catálogo + nomes de serviço dos caches e roda as invariantes.
// Zero HTTP externo: só banco. Seguro para rodar junto da auditoria forense.
import {
  analyzeCatalogCoherence,
  type CoherenceIssue,
  type CoherenceRow,
} from "@/lib/catalog-coherence";

const ID_COLUMNS = [
  "smmhype_service_id",
  "smmhype_auto_id",
  "smmpanel_service_id",
  "smmpanel_auto_id",
  "verified_service_id",
  "verified_auto_id",
  "provider4_service_id",
  "provider4_auto_id",
  "provider_service_id",
];

const CACHE_TABLES = [
  "services_cache",
  "smmpanel_services_cache",
  "verified_services_cache",
  "provider4_services_cache",
];

export async function runCatalogCoherence(): Promise<CoherenceIssue[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: items } = await supabaseAdmin
    .from("pricing_items" as any)
    .select(["pacote", "category", "quantidade", "cost_brl", "price_brl", "last_dry_run", ...ID_COLUMNS].join(", "));

  const rows: CoherenceRow[] = ((items as any[]) ?? []).map((r) => ({
    pacote: String(r.pacote),
    category: r.category ?? null,
    quantidade: r.quantidade ?? null,
    cost_brl: r.cost_brl ?? null,
    price_brl: r.price_brl ?? null,
    last_dry_run: r.last_dry_run ?? null,
    serviceIds: [
      ...new Set(
        ID_COLUMNS.map((c) => r[c])
          .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
          .map((v) => String(v).trim()),
      ),
    ],
  }));

  const serviceNames = new Map<string, string>();
  await Promise.all(
    CACHE_TABLES.map(async (t) => {
      try {
        const { data } = await supabaseAdmin
          .from(t as any)
          .select("provider_service_id, name");
        for (const s of ((data as any[]) ?? [])) {
          const id = String(s.provider_service_id ?? "").trim();
          if (id && s.name && !serviceNames.has(id)) serviceNames.set(id, String(s.name));
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

