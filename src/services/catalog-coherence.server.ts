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
