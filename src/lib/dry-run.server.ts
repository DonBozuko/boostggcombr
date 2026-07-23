// v214 + v217 — Teste seco pacote-a-pacote.
//
// Regras:
//  1. cost_brl > 0        (senão: "Custo zerado")
//  2. price_brl > 0       (senão: "Preço zerado")
//  3. tem pelo menos 1 ID de fornecedor (senão: "Sem fornecedor vinculado")
//  4. pelo menos 1 desses IDs aparece no catálogo vivo do fornecedor
//     correspondente (senão: "Fornecedor não reconhece o ID")
//  5. min ≤ quantidade ≤ max do fornecedor (senão: "Fora do range do fornecedor")
//  6. v217 TRAVA DINÂMICA: menor custo vivo precisa manter margem mínima.
//     Se custo dispara → pausa. Quando cai, próximo dry-run reativa sozinho.
const MIN_MARGIN = 0.70;

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchServiceCatalog, RESERVE_PROVIDER_ENDPOINTS } from "./pricing-cache.server";

type ProviderKey = "smmhype" | "smmpanel" | "verified";

type Row = {
  pacote: string;
  category: string | null;
  quantidade: number;
  cost_brl: number | null;
  price_brl: number | null;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
};

type CatalogEntry = { rate: number | string; min?: number | string; max?: number | string };

function idx(list: Awaited<ReturnType<typeof fetchServiceCatalog>>) {
  const m = new Map<string, CatalogEntry>();
  if (!list) return m;
  for (const s of list) {
    const id = String((s as any).service ?? "").trim();
    if (id) m.set(id, s as any);
  }
  return m;
}

function inRange(qty: number, entry: CatalogEntry | undefined): boolean {
  if (!entry) return false;
  const min = Number(entry.min ?? 0);
  const max = Number(entry.max ?? Number.MAX_SAFE_INTEGER);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return true;
  return qty >= min && qty <= max;
}

export type DryRunSummary = {
  total: number;
  sellable: number;
  paused: number;
  changed: number;
  byReason: Record<string, number>;
  catalogsAlive: number;
};

export async function runDryRunAllPackages(): Promise<DryRunSummary> {
  const [hype, panel, verified] = await Promise.all([
    process.env.SMMHYPE_API_KEY ? fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.smmhype, process.env.SMMHYPE_API_KEY) : Promise.resolve(null),
    process.env.SMMPAINEL_API_KEY ? fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.smmpanel, process.env.SMMPAINEL_API_KEY) : Promise.resolve(null),
    process.env.VERIFIED_API_KEY ? fetchServiceCatalog(RESERVE_PROVIDER_ENDPOINTS.verified, process.env.VERIFIED_API_KEY) : Promise.resolve(null),
  ]);

  const catalogsAlive = [hype, panel, verified].filter((l) => Array.isArray(l) && l.length > 0).length;
  const indices: Record<ProviderKey, Map<string, CatalogEntry>> = {
    smmhype: idx(hype),
    smmpanel: idx(panel),
    verified: idx(verified),
  };

  const { data: rows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id, is_sellable, sellable_reason");

  const summary: DryRunSummary = {
    total: 0,
    sellable: 0,
    paused: 0,
    changed: 0,
    byReason: {},
    catalogsAlive,
  };

  const now = new Date().toISOString();

  for (const raw of ((rows as any[]) ?? [])) {
    summary.total++;
    const r = raw as Row & { is_sellable: boolean; sellable_reason: string | null };

    const cost = Number(r.cost_brl);
    const price = Number(r.price_brl);
    const qty = Number(r.quantidade);

    let sellable = false;
    let reason = "OK";

    const providers: Array<[ProviderKey, string | null]> = [
      ["smmhype", r.smmhype_service_id],
      ["smmpanel", r.smmpanel_service_id],
      ["verified", r.verified_service_id],
    ];
    const linkedProviders = providers.filter(([, id]) => !!id && id.trim().length > 0);

    if (!(cost > 0)) {
      reason = "Custo zerado";
    } else if (!(price > 0)) {
      reason = "Preço zerado";
    } else if (linkedProviders.length === 0) {
      reason = "Sem fornecedor vinculado";
    } else if (catalogsAlive === 0) {
      // Não consigo validar agora — não pauso, preservo estado anterior.
      sellable = r.is_sellable;
      reason = r.sellable_reason ?? "Sem catálogo vivo pra revalidar";
    } else {
      // Ao menos 1 provedor tem que reconhecer o ID + aceitar a quantidade.
      let matched = false;
      let anyKnown = false;
      for (const [prov, id] of linkedProviders) {
        const entry = indices[prov].get(id!.trim());
        if (entry) {
          anyKnown = true;
          if (inRange(qty, entry)) { matched = true; break; }
        }
      }
      if (matched) {
        // v217: trava dinâmica de margem. price/cost precisa manter margem
        // mínima. Se custo do fornecedor subiu e comeu lucro, pausa. Assim
        // que sync baixar o cost_brl de volta, próximo dry-run reativa.
        const margem = price > 0 ? (price - cost) / price : 0;
        if (margem < MIN_MARGIN) {
          sellable = false;
          reason = `Custo do fornecedor subiu (margem ${(margem * 100).toFixed(0)}%)`;
        } else {
          sellable = true;
          reason = "OK";
        }
      } else if (anyKnown) {
        reason = "Fora do range do fornecedor";
      } else {
        reason = "Fornecedor não reconhece o ID";
      }
    }


    summary.byReason[reason] = (summary.byReason[reason] ?? 0) + 1;
    if (sellable) summary.sellable++; else summary.paused++;

    const changed = r.is_sellable !== sellable || (r.sellable_reason ?? "") !== reason;
    if (changed) summary.changed++;

    await supabaseAdmin
      .from("pricing_items" as any)
      .update({
        is_sellable: sellable,
        sellable_reason: reason,
        last_dry_run: now,
      })
      .eq("pacote", r.pacote);
  }

  return summary;
}
