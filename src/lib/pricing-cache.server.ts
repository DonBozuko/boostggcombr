// v137 — Strict Canonical Link Matrix.
// A busca heurística por aproximação de nomes foi EXTERMINADA (evita IDs replicados
// tipo 7593 colado em lote). Agora os IDs em pricing_items são a fonte da verdade:
// - Sem preenchimento automático por nome.
// - Sincronismo contínuo lê os catálogos remotos indexados por service_id e atualiza
//   apenas cost_brl (rate vivo) recalculando price_brl com a Equação Fabiano.
// Preserva HUD v57, largura +80px v101, grade 200 v107, cronômetro 3min v105,
// Mystery Box v115, Margin Guardian v135, Rate Limit v129, Telegram v125.

import { computeGuardedPrice } from "./margin-guardian";

type PricingRow = {
  pacote: string;
  quantidade: number;
  price_brl: number;
  cost_brl: number;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
};

let lastReserveSyncAt = 0;

export function purgePricingCacheMemory(reason = "v137-force-purge"): void {
  lastReserveSyncAt = 0;
  console.log(`[pricing-cache] purge absoluto de cache em memória (${reason})`);
}

async function refresh(): Promise<Map<string, PricingRow>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, quantidade, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id");
  const map = new Map<string, PricingRow>();
  for (const r of ((data as any[]) ?? [])) map.set(String(r.pacote), r as PricingRow);
  return map;
}

export async function getPricingRow(pacote: string): Promise<PricingRow | null> {
  const map = await refresh();
  return map.get(pacote) ?? null;
}

export async function primePricingCache(): Promise<void> {
  await refresh();
}

// ============================================================
// v137 — Canonical Link Sync (rate + saldo, sem heurística)
// ============================================================

type RemoteService = {
  service: number | string;
  name: string;
  category?: string;
  rate: number | string;
  min?: number | string;
  max?: number | string;
};

export const RESERVE_PROVIDER_ENDPOINTS = {
  smmhype: "https://smmhype.com/api/v2",
  smmpanel: "https://smmpainel.com/api/v2",
  verified: "https://verifiedatacado.com/api/v2",
} as const;

export async function fetchServiceCatalog(endpoint: string, apiKey: string): Promise<RemoteService[] | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Accept": "application/json,text/plain,*/*",
          "User-Agent": "EliteBoostPrime-CanonicalSync/137",
        },
        body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }
    if (!res.ok) return null;
    const txt = (await res.text()).trim();
    if (!txt || (txt[0] !== "[" && txt[0] !== "{")) return null;
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed as RemoteService[] : null;
  } catch { return null; }
}

function cleanId(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t ? t : null;
}

function indexById(list: RemoteService[] | null): Map<string, RemoteService> {
  const m = new Map<string, RemoteService>();
  if (!list) return m;
  for (const s of list) {
    const id = cleanId(s.service);
    if (id) m.set(id, s);
  }
  return m;
}

// ============================================================
// v266 — Canonical Sync multi-fornecedor com câmbio correto.
// Antes (v137): só 3 fornecedores hardcoded e rate cru sem moeda.
// Como SMMhype cobra em USD e os demais em BRL, o Math.min pegava
// o número USD (menor) como se fosse real → custo subestimado ~5x
// → preço do site abaixo da margem. Agora:
//  - fornecedores vêm da tabela (inclui provider4/SMMOficial)
//  - rate é normalizado para BRL usando fornecedores.moeda + cotacao_brl
//  - IDs curados E auto-resolvidos são conferidos
//  - ID que some do catálogo remoto vira "ID fantasma" (streak + alerta)
// ============================================================

type ProviderCfg = {
  slug: string;
  nome: string;
  column: string;      // prefixo das colunas em pricing_items
  endpoint: string;
  apiKey: string | null;
  fx: number;          // multiplicador para converter rate → BRL
};

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

const GHOST_ALERT_STREAK = 3;

export async function syncReserveProviderIds() {
  purgePricingCacheMemory("syncReserveProviderIds:start");
  return syncReserveProviderIdsNow({ force: true });
}

export async function ensureReserveProviderIdsFresh(staleMs = 30_000): Promise<void> {
  if (Date.now() - lastReserveSyncAt < staleMs) return;
  await syncReserveProviderIdsNow({ force: false }).then(() => {}, (e) => {
    console.warn("[pricing-cache] v266 canonical sync lazy falhou", e);
  });
}

async function syncReserveProviderIdsNow(_opts: { force: boolean }) {
  purgePricingCacheMemory(_opts.force ? "v266-force-live-handshake" : "v266-lazy-live-handshake");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: fornRows } = await supabaseAdmin
    .from("fornecedores" as any)
    .select("slug, nome, ativo, moeda, cotacao_brl, api_url, api_key_secret")
    .eq("ativo", true);

  const providers: ProviderCfg[] = ((fornRows as any[]) ?? []).map((f) => {
    const moeda = String(f.moeda ?? "").toUpperCase();
    const cot = Number(f.cotacao_brl) > 0 ? Number(f.cotacao_brl) : 5.0;
    return {
      slug: String(f.slug),
      nome: String(f.nome ?? f.slug),
      column: SLUG_TO_COLUMN[String(f.slug)] ?? String(f.slug),
      endpoint: normalizeEndpoint(f.api_url),
      apiKey: process.env[String(f.api_key_secret ?? "")] ?? null,
      // v266 — só converte quando o fornecedor cobra em USD. Moeda ausente = trata
      // como BRL (fx=1) para NUNCA subestimar custo por conversão inventada.
      fx: moeda === "USD" ? cot : 1,
    };
  }).filter((p) => p.endpoint);

  // Handshake vivo em paralelo em TODOS os fornecedores ativos.
  const catalogs = await Promise.all(
    providers.map(async (p) => ({
      p,
      list: p.apiKey ? await fetchServiceCatalog(p.endpoint, p.apiKey) : null,
    })),
  );

  const alive = catalogs.filter((c) => Array.isArray(c.list) && c.list!.length > 0);
  if (alive.length === 0) {
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      await dispatchWhatsappAlert(
        `🚨 SINCRONIZAÇÃO DE PREÇOS FALHOU\n\nPROBLEMA: nenhum dos ${providers.length} fornecedores devolveu catálogo. Preços do site podem ficar desatualizados.\n\nO QUE FAZER: verificar se as APIs dos fornecedores estão fora do ar ou se alguma chave expirou. Enquanto isso, os preços antigos continuam valendo.`,
      ).catch(() => {});
    } catch { /* noop */ }
  }

  const idx = new Map<string, { cfg: ProviderCfg; map: Map<string, RemoteService>; alive: boolean }>();
  for (const c of catalogs) {
    idx.set(c.p.slug, {
      cfg: c.p,
      map: indexById(c.list),
      alive: Array.isArray(c.list) && c.list.length > 0,
    });
  }

  const selectCols = [
    "pacote", "category", "quantidade", "cost_brl", "price_brl",
    "id_miss_streak", "id_miss_since",
    ...providers.flatMap((p) => [`${p.column}_service_id`, `${p.column}_auto_id`]),
  ];
  const { data: rows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select([...new Set(selectCols)].join(", "));

  const bound: Record<string, number> = {};
  const ghostList: Array<{ pacote: string; streak: number }> = [];
  const repriced: Array<{ pacote: string; de: number; para: number; fornecedor: string }> = [];
  let updated_rows = 0;

  for (const r of ((rows as any[]) ?? [])) {
    const qty = Number(r.quantidade);
    const costs: Array<{ slug: string; cost: number }> = [];
    let hadBoundId = false;
    let anyRelevantCatalogAlive = false;
    let resolvedAny = false;

    for (const p of providers) {
      const entry = idx.get(p.slug)!;
      const id = cleanId(r[`${p.column}_service_id`]) ?? cleanId(r[`${p.column}_auto_id`]);
      if (!id) continue;
      hadBoundId = true;
      if (entry.alive) anyRelevantCatalogAlive = true;
      const hit = entry.map.get(id);
      if (!hit) continue;
      resolvedAny = true;
      bound[p.slug] = (bound[p.slug] ?? 0) + 1;
      const rate = Number(hit.rate);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      // rate é por 1000 na moeda do fornecedor → normaliza para BRL.
      costs.push({ slug: p.slug, cost: Number(((rate * p.fx * qty) / 1000).toFixed(4)) });
    }

    // ---- Detector de ID fantasma (não auto-troca ID: só sinaliza) ----
    const prevStreak = Number(r.id_miss_streak ?? 0);
    let nextStreak = prevStreak;
    let missSince: string | null = r.id_miss_since ?? null;
    if (hadBoundId && anyRelevantCatalogAlive && !resolvedAny) {
      nextStreak = prevStreak + 1;
      if (!missSince) missSince = new Date().toISOString();
      if (nextStreak >= GHOST_ALERT_STREAK) ghostList.push({ pacote: r.pacote, streak: nextStreak });
    } else if (resolvedAny) {
      nextStreak = 0;
      missSince = null;
    }

    const patch: Record<string, unknown> = {};
    if (nextStreak !== prevStreak) patch.id_miss_streak = nextStreak;
    if ((missSince ?? null) !== (r.id_miss_since ?? null)) patch.id_miss_since = missSince;

    if (costs.length > 0) {
      const best = costs.reduce((a, b) => (b.cost < a.cost ? b : a));
      const newCost = best.cost;
      const newPrice = computeGuardedPrice(newCost, qty); // Equação Fabiano Tiered v173
      const oldPrice = Number(r.price_brl ?? 0);
      const costChanged = Math.abs(newCost - Number(r.cost_brl ?? 0)) > 0.0001;
      const priceChanged = Math.abs(newPrice - oldPrice) > 0.009;
      // v266 — Reajuste automático COM freio de choque.
      // Alta suave (até +50%) entra sozinha: é o preço se ajustando ao custo real.
      // Alta violenta NÃO troca a etiqueta na cara do cliente: o custo real é
      // gravado, o pacote sai da vitrine (is_sellable=false) e o dono decide
      // trocar de fornecedor ou reposicionar. Nunca vender abaixo da margem,
      // nunca dar susto de preço sem decisão humana.
      const shock = oldPrice > 0 && newPrice / oldPrice > 1.5;
      if (costChanged || priceChanged) {
        patch.cost_brl = newCost;
        patch.last_cost_source = best.slug;
        patch.synced_at = new Date().toISOString();
        if (shock) {
          patch.is_sellable = false;
          patch.sellable_reason = `custo do fornecedor subiu: preço justo seria R$ ${newPrice.toFixed(2)} (hoje R$ ${oldPrice.toFixed(2)}) — revisar fornecedor ou preço`;
          repriced.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
        } else {
          patch.price_brl = newPrice;
          if (oldPrice > 0 && newPrice / oldPrice <= 0.6) {
            repriced.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
          }
        }
      }
    }

    if (Object.keys(patch).length === 0) continue;
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .update(patch)
      .eq("pacote", r.pacote);
    if (error) {
      console.error("[pricing-cache] v266 UPDATE falhou", { pacote: r.pacote, error: error.message });
    } else if (patch.price_brl !== undefined || patch.cost_brl !== undefined) {
      updated_rows++;
    }
  }

  // Alerta único e em português sobre pacotes com ID sumido.
  if (ghostList.length > 0) {
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      const amostra = ghostList.slice(0, 8).map((g) => `• ${g.pacote}`).join("\n");
      await dispatchWhatsappAlert(
        `⚠️ PACOTES SUMIRAM DO FORNECEDOR\n\nPROBLEMA: ${ghostList.length} pacote(s) apontam para um código de serviço que o fornecedor não lista mais há ${GHOST_ALERT_STREAK} verificações seguidas.\n\n${amostra}\n\nO QUE FAZER: abrir o painel de preços no admin e escolher o serviço novo para esses pacotes. Nada foi trocado sozinho para não errar o pacote.`,
      ).catch(() => {});
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: "system@sync",
        action: "ghost_service_ids_v266",
        detail: { total: ghostList.length, pacotes: ghostList.slice(0, 50) } as any,
      });
    } catch { /* noop */ }
  }

  // v266 — Alerta de reprecificação forte (custo do fornecedor mudou muito).
  if (repriced.length > 0) {
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      const amostra = repriced
        .slice(0, 8)
        .map((x) => `• ${x.pacote}: R$ ${x.de.toFixed(2)} → R$ ${x.para.toFixed(2)} (${x.fornecedor})`)
        .join("\n");
      await dispatchWhatsappAlert(
        `💰 PREÇOS DO SITE MUDARAM SOZINHOS\n\nPROBLEMA: o fornecedor mexeu forte no custo de ${repriced.length} pacote(s). Reajuste pequeno já entrou sozinho; pacote que ficaria caro demais foi TIRADO DA VITRINE em vez de mudar o preço na cara do cliente.\n\n${amostra}\n\nO QUE FAZER: no admin, trocar o fornecedor desse pacote, aceitar o preço novo ou aposentar o pacote.`,
      ).catch(() => {});
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: "system@sync",
        action: "reprecificacao_forte_v266",
        detail: { total: repriced.length, itens: repriced.slice(0, 50) } as any,
      });
    } catch { /* noop */ }
  }

  const perProvider = Object.fromEntries(
    providers.map((p) => [p.slug, {
      catalog: idx.get(p.slug)?.map.size ?? 0,
      bound: bound[p.slug] ?? 0,
      moeda_fx: p.fx,
    }]),
  );

  console.log("[pricing-cache] v266 canonical sync", {
    providers: perProvider,
    scanned: ((rows as any[]) ?? []).length,
    updated_rows,
    ghosts: ghostList.length,
  });

  lastReserveSyncAt = Date.now();
  purgePricingCacheMemory("syncReserveProviderIds:end");

  return {
    // compat v137 (consumidores antigos)
    smmhype_filled: bound["smmhype"] ?? 0,
    smmpanel_filled: bound["smmpainel"] ?? bound["smmpanel"] ?? 0,
    verified_filled: bound["verified"] ?? 0,
    smmhype_catalog: idx.get("smmhype")?.map.size ?? 0,
    smmpanel_catalog: idx.get("smmpainel")?.map.size ?? idx.get("smmpanel")?.map.size ?? 0,
    verified_catalog: idx.get("verified")?.map.size ?? 0,
    // v266
    provider4_filled: bound["provider4"] ?? 0,
    provider4_catalog: idx.get("provider4")?.map.size ?? 0,
    providers: perProvider,
    ghosts: ghostList.length,
    scanned: ((rows as any[]) ?? []).length,
    updated_rows,
  };
}
