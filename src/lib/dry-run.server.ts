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
//
// v334 — PONTO ÚNICO DE VERDADE DE MARGEM.
// Aqui existia `MIN_MARGIN = 0.70` (margem percentual fixa ≈ 3,33x) escrito à
// mão em 2 lugares do projeto. A v328 passou a exigir markup MENOR conforme o
// custo absoluto sobe (pacote de custo R$ 963 é saudável a ~2,0x). O limiar
// velho não foi atualizado: a Autoridade de Preço dizia "preço correto, não
// mexer" e este teste dizia "prejuízo, pausar" — no mesmo pacote, para sempre.
// Resultado: p500k, tf100k, yv1m, yv750k, kv250k e tl500k pausados e alarme a
// cada ciclo, sem prejuízo nenhum (p500k lucra ~R$ 1.076 por venda).
// Regra: quem decide margem é `margin-guardian`. Ninguém mais.

import { respectsMinMargin } from "./margin-guardian";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchServiceCatalog, RESERVE_PROVIDER_ENDPOINTS } from "./pricing-cache.server";

type ProviderKey = string;

type Row = {
  pacote: string;
  category: string | null;
  quantidade: number;
  cost_brl: number | null;
  price_brl: number | null;
} & Record<string, unknown>;

type CatalogEntry = { rate: number | string; min?: number | string; max?: number | string; name?: string; category?: string };

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

// v240 — trava de conteúdo do serviço.
// 1) serviço que o próprio fornecedor marca como lixo (queda de 100%, "não compre") nunca vende;
// 2) pacote :br só aceita serviço realmente brasileiro.
const TOXIC_RE = /n[aã]o\s*compre|queda\s*de\s*100|100%\s*de?\s*queda|drop\s*100/i;
const BR_RE = /brasil|brazil|brasileir|🇧🇷/i;

function serviceContentIssue(entry: CatalogEntry, packageCategory: string): string | null {
  const hay = `${entry.name ?? ""} ${entry.category ?? ""}`;
  if (TOXIC_RE.test(hay)) return "Serviço marcado como queda pelo fornecedor";
  if (packageCategory.endsWith(":br") && !BR_RE.test(hay)) return "Serviço não é brasileiro";
  return null;
}


export type DryRunSummary = {
  total: number;
  sellable: number;
  paused: number;
  changed: number;
  byReason: Record<string, number>;
  catalogsAlive: number;
};

// v290 — fornecedores vêm da tabela `fornecedores` (inclui provider4/SMMOficial),
// e conferimos tanto o ID curado quanto o auto-resolvido. Antes só 3 fornecedores
// e só a coluna curada eram checados: pacote atendido pelo 4º fornecedor (ou só
// com auto_id) era pausado sem motivo — sumia mercadoria da prateleira.
const SLUG_TO_COLUMN: Record<string, string> = {
  smmhype: "smmhype",
  smmpainel: "smmpanel",
  smmpanel: "smmpanel",
  verified: "verified",
  provider4: "provider4",
};

function normalizeEndpoint(apiUrl: string): string {
  const base = String(apiUrl ?? "").trim().replace(/\/+$/, "");
  if (!base) return "";
  return /\/api\/v2$/.test(base) ? base : `${base}/api/v2`;
}

type ProviderCfg = { slug: string; column: string; endpoint: string; apiKey: string | null };

async function loadProviders(): Promise<ProviderCfg[]> {
  try {
    const { data } = await supabaseAdmin
      .from("fornecedores" as any)
      .select("slug, ativo, api_url, api_key_secret")
      .eq("ativo", true);
    const list = ((data as any[]) ?? [])
      .map((f) => ({
        slug: String(f.slug),
        column: SLUG_TO_COLUMN[String(f.slug)] ?? String(f.slug),
        endpoint: normalizeEndpoint(f.api_url),
        apiKey: process.env[String(f.api_key_secret ?? "")] ?? null,
      }))
      .filter((p) => p.endpoint);
    if (list.length > 0) return list;
  } catch { /* cai no fallback abaixo */ }
  // Fallback: os 3 fornecedores históricos, para o dry-run nunca ficar cego.
  return [
    { slug: "smmhype", column: "smmhype", endpoint: RESERVE_PROVIDER_ENDPOINTS.smmhype, apiKey: process.env.SMMHYPE_API_KEY ?? null },
    { slug: "smmpanel", column: "smmpanel", endpoint: RESERVE_PROVIDER_ENDPOINTS.smmpanel, apiKey: process.env.SMMPAINEL_API_KEY ?? null },
    { slug: "verified", column: "verified", endpoint: RESERVE_PROVIDER_ENDPOINTS.verified, apiKey: process.env.VERIFIED_API_KEY ?? null },
  ];
}

export async function runDryRunAllPackages(): Promise<DryRunSummary> {
  const providersCfg = await loadProviders();
  const catalogs = await Promise.all(
    providersCfg.map(async (p) => ({
      p,
      list: p.apiKey ? await fetchServiceCatalog(p.endpoint, p.apiKey) : null,
    })),
  );

  const catalogsAlive = catalogs.filter((c) => Array.isArray(c.list) && c.list!.length > 0).length;
  const indices: Record<ProviderKey, Map<string, CatalogEntry>> = {};
  for (const c of catalogs) indices[c.p.column] = idx(c.list);

  const columns = [...new Set(providersCfg.map((p) => p.column))];
  const selectCols = [
    "pacote", "category", "quantidade", "cost_brl", "price_brl", "is_sellable", "sellable_reason",
    ...columns.flatMap((c) => [`${c}_service_id`, `${c}_auto_id`]),
  ];
  const { data: rows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select([...new Set(selectCols)].join(", "));

  const summary: DryRunSummary = {
    total: 0,
    sellable: 0,
    paused: 0,
    changed: 0,
    byReason: {},
    catalogsAlive,
  };

  const now = new Date().toISOString();
  const vetos: { pacote: string; motivo: string }[] = [];

  for (const raw of ((rows as any[]) ?? [])) {
    summary.total++;
    const r = raw as Row & { is_sellable: boolean; sellable_reason: string | null };

    const cost = Number(r.cost_brl);
    const price = Number(r.price_brl);
    const qty = Number(r.quantidade);

    let sellable = false;
    let reason = "OK";

    const providers: Array<[ProviderKey, string | null]> = [];
    for (const col of columns) {
      for (const suffix of ["_service_id", "_auto_id"]) {
        const v = r[`${col}${suffix}`];
        if (typeof v === "string" || typeof v === "number") providers.push([col, String(v)]);
      }
    }
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
      // Ao menos 1 provedor tem que reconhecer o ID + aceitar a quantidade
      // + o serviço tem que ser coerente com o pacote (BR de verdade, não-tóxico).
      let matched = false;
      let anyKnown = false;
      let contentIssue: string | null = null;
      for (const [prov, id] of linkedProviders) {
        const entry = indices[prov]?.get(id!.trim());
        if (entry) {
          anyKnown = true;
          const issue = serviceContentIssue(entry, String(r.category ?? ""));
          if (issue) { contentIssue = issue; continue; }
          if (inRange(qty, entry)) { matched = true; break; }
        }
      }
      if (matched) {
        // v334: a trava dinâmica continua, mas usando a MESMA régua do motor de
        // preço (margin-guardian → markup exigido cai conforme o custo sobe).
        if (!respectsMinMargin(price, cost)) {
          const margem = price > 0 ? (price - cost) / price : 0;
          sellable = false;
          reason = `Custo do fornecedor subiu (margem ${(margem * 100).toFixed(0)}%)`;
        } else {
          sellable = true;
          reason = "OK";
        }
      } else if (contentIssue) {
        reason = contentIssue;
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

    // v372 — o teste seco NÃO grava mais `is_sellable`. Ele registra a data da
    // checagem e vota; a Autoridade de Vitrine decide.
    if (!sellable) vetos.push({ pacote: String(r.pacote), motivo: reason });

    await supabaseAdmin
      .from("pricing_items" as any)
      .update({ last_dry_run: now })
      .eq("pacote", r.pacote);
  }

  // Sem catálogo vivo não dá para revalidar nada: preserva o estado anterior
  // (não mexe nos vetos) em vez de pausar o catálogo inteiro por cegueira.
  if (catalogsAlive > 0) {
    const { syncShelfVetoes } = await import("./shelf-authority.server");
    await syncShelfVetoes("teste-seco", vetos).catch((e) =>
      console.error("[teste-seco] v372 veto falhou", e),
    );
  }

  return summary;
}
