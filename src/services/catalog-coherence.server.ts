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

  // v308 — leitura paginada. O cache do fornecedor principal tem 6.000+ serviços
  // e a API corta em 1.000 por padrão: a auditoria ficava cega para o resto e
  // tratava serviço válido como "desconhecido", pausando pacote saudável.
  const serviceNames = new Map<string, string>();
  const PAGE = 1000;
  await Promise.all(
    CACHE_TABLES.map(async ({ table, provider }) => {
      try {
        for (let from = 0; ; from += PAGE) {
          const { data } = await supabaseAdmin
            .from(table as any)
            .select("provider_service_id, name")
            .range(from, from + PAGE - 1);
          const page = (data as any[]) ?? [];
          for (const s of page) {
            const id = String(s.provider_service_id ?? "").trim();
            if (id && s.name) serviceNames.set(serviceKey({ provider, id }), String(s.name));
          }
          if (page.length < PAGE) break;
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
): Promise<{ paused: string[]; restored: string[]; errors: number }> {
  const alvos = new Map<string, string>();
  for (const i of issues) {
    if (!AUTO_PAUSE_CODES.has(i.code)) continue;
    // v308 — só tira da vitrine achado crítico. Custo alto com serviço correto
    // vira aviso, não pausa: tier premium é produto, não defeito.
    if (i.severity !== "critical") continue;

    if (!alvos.has(i.pacote)) alvos.set(i.pacote, `${PAUSE_PREFIX}: ${i.detalhe}`);
  }


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

  // v308 — religamento do que esta trava pausou e não é mais problema.
  // Só volta à vitrine quem: foi pausado por ESTA trava, não tem mais achado
  // crítico, e passou por teste seco nas últimas 48h. Sem teste recente, fica fora.
  const restored: string[] = [];
  const limite = new Date(Date.now() - 48 * 3600_000).toISOString();
  const { data: pausados } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, sellable_reason, last_dry_run")
    .eq("is_sellable", false)
    .like("sellable_reason", `${PAUSE_PREFIX}%`);

  for (const p of ((pausados as any[]) ?? [])) {
    const pacote = String(p.pacote);
    if (alvos.has(pacote)) continue;
    if (!p.last_dry_run || String(p.last_dry_run) < limite) continue;
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .update({ is_sellable: true, sellable_reason: null })
      .eq("pacote", pacote)
      .eq("is_sellable", false);
    if (error) { errors += 1; continue; }
    restored.push(pacote);
  }

  if (paused.length > 0) {
    console.warn(`[coerencia] v304 pausou ${paused.length} pacote(s) incoerente(s):`, paused.join(", "));
  }
  if (restored.length > 0) {
    console.info(`[coerencia] v308 religou ${restored.length} pacote(s):`, restored.join(", "));
  }
  return { paused, restored, errors };
}


