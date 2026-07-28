// v137 — Strict Canonical Link Matrix.
// A busca heurística por aproximação de nomes foi EXTERMINADA (evita IDs replicados
// tipo 7593 colado em lote). Agora os IDs em pricing_items são a fonte da verdade:
// - Sem preenchimento automático por nome.
// - Sincronismo contínuo lê os catálogos remotos indexados por service_id e atualiza
//   apenas cost_brl (rate vivo) recalculando price_brl com a Equação Fabiano.
// Preserva HUD v57, largura +80px v101, grade 200 v107, cronômetro 3min v105,
// Mystery Box v115, Margin Guardian v135, Rate Limit v129, Telegram v125.

import { computeGuardedPrice, respectsMinMargin } from "./margin-guardian";

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

// ============================================================
// v275 — Quarentena de preço em massa.
// Regra dura: se mais de 30% do catálogo mudaria de preço no mesmo ciclo,
// NADA de preço é gravado. A leitura fica guardada e só vira preço real
// quando a leitura idêntica se repetir (2ª confirmação) ou o dono aprovar.
// ============================================================
const MASS_CHANGE_RATIO = 0.3;
// v311 — variação de custo abaixo de 5% é ruído de câmbio/arredondamento do
// fornecedor. Não conta como "pacote mudou de preço" para o freio de massa.
const MOVE_THRESHOLD = 0.05;
// v282 — Faixas de reajuste de custo do fornecedor.
const AUTO_UP_MAX = 1.40;   // até +40%: aplica sozinho
const RETIRE_ABOVE = 1.80;  // acima de +80%: aposenta o pacote
const QUARANTINE_KEY = "price_quarantine";
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const PRICE_KEYS = new Set([
  "cost_brl", "price_brl", "last_cost_source", "synced_at", "is_sellable", "sellable_reason",
]);

export type PriceQuarantine = {
  signature: string;
  total: number;
  scanned: number;
  applied: boolean;
  approved: boolean;
  last_alert_at: string | null;
  updated_at: string;
  amostra: Array<{ pacote: string; para: number }>;
};

async function hashSignature(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readQuarantine(supabaseAdmin: any): Promise<PriceQuarantine | null> {
  try {
    const { data } = await supabaseAdmin
      .from("admin_settings").select("value").eq("key", QUARANTINE_KEY).maybeSingle();
    const v = data?.value;
    return v && typeof v === "object" && v.signature ? (v as PriceQuarantine) : null;
  } catch { return null; }
}

async function writeQuarantine(supabaseAdmin: any, value: PriceQuarantine): Promise<void> {
  try {
    await supabaseAdmin.from("admin_settings").upsert(
      { key: QUARANTINE_KEY, value: value as any }, { onConflict: "key" },
    );
  } catch { /* noop */ }
}

async function clearQuarantine(supabaseAdmin: any): Promise<void> {
  try {
    await supabaseAdmin.from("admin_settings").delete().eq("key", QUARANTINE_KEY);
  } catch { /* noop */ }
}


export async function syncReserveProviderIds(opts?: { bypassLock?: boolean }) {
  purgePricingCacheMemory("syncReserveProviderIds:start");
  return syncReserveProviderIdsNow({ force: true, bypassLock: opts?.bypassLock === true });
}


export async function ensureReserveProviderIdsFresh(staleMs = 30_000): Promise<void> {
  if (Date.now() - lastReserveSyncAt < staleMs) return;
  await syncReserveProviderIdsNow({ force: false }).then(() => {}, (e) => {
    console.warn("[pricing-cache] v266 canonical sync lazy falhou", e);
  });
}

/** v271 — trava global de execução única (vale entre isolates/servidores).
 * Reaproveita rate_limit_check (já existe no banco, SECURITY DEFINER):
 * 1 execução a cada 120s no projeto inteiro. Sem isso, cron + admin +
 * dispatch rodavam a sincronização ao mesmo tempo, cada uma lia um preço
 * antigo diferente e o alerta de reprecificação disparava em looping. */
async function acquireSyncLock(supabaseAdmin: any, windowSeconds = 120): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc("rate_limit_check", {
      _key: "pricing_sync_global",
      _limit: 1,
      _window_seconds: windowSeconds,
    });
    if (error) return true; // fail-open: nunca travar a sincronização por erro da trava
    const row = Array.isArray(data) ? data[0] : data;
    return row?.allowed !== false;
  } catch {
    return true;
  }
}

const SKIPPED_REPORT = {
  skipped: true,
  smmhype_filled: 0, smmpanel_filled: 0, verified_filled: 0,
  smmhype_catalog: 0, smmpanel_catalog: 0, verified_catalog: 0,
  provider4_filled: 0, provider4_catalog: 0,
  providers: {}, ghosts: 0, scanned: 0, updated_rows: 0,
  restored: 0, restored_pacotes: [] as string[],
};

async function syncReserveProviderIdsNow(_opts: { force: boolean; bypassLock?: boolean }) {
  purgePricingCacheMemory(_opts.force ? "v266-force-live-handshake" : "v266-lazy-live-handshake");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (!_opts.bypassLock && !(await acquireSyncLock(supabaseAdmin))) {
    console.log("[pricing-cache] v271 sync ignorado: outra execução em andamento");
    lastReserveSyncAt = Date.now();
    return SKIPPED_REPORT;
  }


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
    "id_miss_streak", "id_miss_since", "is_sellable", "sellable_reason",
    ...providers.flatMap((p) => [`${p.column}_service_id`, `${p.column}_auto_id`]),
  ];
  const { data: rows } = await supabaseAdmin
    .from("pricing_items" as any)
    .select([...new Set(selectCols)].join(", "));

  const bound: Record<string, number> = {};
  const ghostList: Array<{ pacote: string; streak: number }> = [];
  const repriced: Array<{ pacote: string; de: number; para: number; fornecedor: string }> = [];
  // v282 — reajustes aplicados sozinhos (dentro do teto de +40%) e aposentadorias.
  const reajustados: Array<{ pacote: string; de: number; para: number; fornecedor: string }> = [];
  const aposentados: Array<{ pacote: string; de: number; para: number; fornecedor: string }> = [];
  const restored: string[] = [];
  let updated_rows = 0;

  // v275 — FASE 1: só PLANEJA. Nada vai para o banco antes de medir o
  // tamanho do estrago. Antes, o preço já tinha sido gravado quando o
  // alerta "leitura suspeita" saía — o aviso chegava tarde demais.
  type Plan = {
    pacote: string;
    patch: Record<string, unknown>;
    priceKeys: string[];       // chaves que só existem por causa de preço/custo
    movesPrice: boolean;
    restoredPacote: string | null;
  };
  const plans: Plan[] = [];



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

    let restoredPacote: string | null = null;
    const patch: Record<string, unknown> = {};
    if (nextStreak !== prevStreak) patch.id_miss_streak = nextStreak;
    if ((missSince ?? null) !== (r.id_miss_since ?? null)) patch.id_miss_since = missSince;

    if (costs.length > 0) {
      // v317 — HISTERESE DE FORNECEDOR (causa raiz do "preço mudou sozinho").
      //
      // Antes era `Math.min` puro entre os fornecedores. Como cada cache de
      // fornecedor sincroniza em horário próprio, o vencedor trocava de um ciclo
      // para o outro por diferença de centavos — e o custo do pacote pulava junto.
      // O motor lia isso como "192 pacotes mudaram de preço", o freio de massa
      // disparava e o Telegram mandava 51 alertas críticos em 48h. Não era o
      // fornecedor mudando preço: era a nossa escolha de fornecedor balançando.
      //
      // Agora o fornecedor atual só é trocado quando o concorrente é
      // materialmente mais barato (>5%). Empate técnico mantém quem já está.
      const maisBarato = costs.reduce((a, b) => (b.cost < a.cost ? b : a));
      const atual = costs.find((c) => c.slug === String(r.last_cost_source ?? ""));
      const best =
        atual && maisBarato.cost > atual.cost * (1 - SWITCH_MIN_GAIN) ? atual : maisBarato;
      const newCost = best.cost;
      const newPrice = computeGuardedPrice(newCost, qty); // Equação Fabiano Tiered v173
      const oldPrice = Number(r.price_brl ?? 0);
      const oldCost = Number(r.cost_brl ?? 0);
      const costChanged = Math.abs(newCost - oldCost) > 0.0001;
      const priceChanged = Math.abs(newPrice - oldPrice) > 0.009;
      // v271 — O gatilho olha CUSTO contra CUSTO (nunca preço contra preço).
      // v282 — Faixas de reajuste automático em vez de trava binária:
      //   até +40%  → aplica sozinho (margem continua protegida)
      //   +40..+80% → pausa e espera decisão do dono
      //   acima     → aposenta o pacote (fornecedor inviável)
      const saltoCusto = oldCost > 0 ? newCost / oldCost : 1;
      const saltoPreco = oldPrice > 0 ? newPrice / oldPrice : 1;
      const subiu = saltoCusto > AUTO_UP_MAX;
      const disparou = saltoCusto > RETIRE_ABOVE;
      const encareceuDeVerdade = subiu && saltoPreco > 1.05;

      if (costChanged || priceChanged) {
        patch.cost_brl = newCost;
        patch.last_cost_source = best.slug;
        patch.synced_at = new Date().toISOString();

        if (!encareceuDeVerdade) {
          // v305 — grava só o CUSTO. O preço é decidido pela autoridade única
          // no fim do ciclo (margem + escada juntas, sem ping-pong).
          // v271 — só avisa queda real de custo (≥40%), não oscilação de piso.
          if (oldCost > 0 && saltoCusto <= 0.6) {
            repriced.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
          }
        } else if (!disparou && respectsMinMargin(newPrice, newCost)) {
          // v282 — Reajuste dentro do teto: religa o pacote; o preço novo sai
          // da autoridade única logo em seguida.
          if (r.is_sellable === false && /^custo (do|real do) fornecedor/i.test(String(r.sellable_reason ?? ""))) {
            patch.is_sellable = true;
            patch.sellable_reason = null;
          }
          reajustados.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
        } else if (disparou) {
          // v282 — Salto acima de +80%: fornecedor virou inviável. Aposenta.
          patch.is_sellable = false;
          patch.sellable_reason = `custo do fornecedor disparou (${Math.round((saltoCusto - 1) * 100)}%): pacote aposentado automaticamente — preço justo seria R$ ${newPrice.toFixed(2)}`;
          if (r.is_sellable !== false) {
            aposentados.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
            repriced.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
          }
        } else {
          // v271 — Faixa de decisão (+40% a +80%): NÃO sobrescreve o preço da
          // vitrine. O pacote sai de venda e o preço justo fica no motivo.
          patch.is_sellable = false;
          patch.sellable_reason = `custo do fornecedor subiu: preço justo seria R$ ${newPrice.toFixed(2)} (hoje R$ ${oldPrice.toFixed(2)}) — revisar fornecedor ou preço`;
          if (r.is_sellable !== false) {
            repriced.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
          }
        }
      }

      // v267 — Auto-religamento. Sem isso o pacote pausado por custo ficava
      // pausado PARA SEMPRE, mesmo depois de o preço já ter convergido para o
      // valor justo. Só religa pausa criada por este próprio motor (prefixo
      // "custo do fornecedor"/"custo real"), nunca pausa manual do dono,
      // e só quando o preço vigente ainda respeita a margem mínima.
      const autoPaused =
        r.is_sellable === false &&
        /^custo (do|real do) fornecedor/i.test(String(r.sellable_reason ?? ""));
      if (autoPaused && patch.is_sellable !== false) {
        const priceNow = Number(patch.price_brl ?? oldPrice);
        if (priceNow > 0 && !encareceuDeVerdade && respectsMinMargin(priceNow, newCost)) {
          patch.is_sellable = true;
          patch.sellable_reason = null;
          restoredPacote = r.pacote;
        }
      }
    }

    if (Object.keys(patch).length === 0) continue;
    const priceKeys = Object.keys(patch).filter((k) => PRICE_KEYS.has(k));
    // v311 — "mudou de verdade" ≠ "mexeu 1 centavo".
    // Bug real: qualquer oscilação de custo (até 0,0001) contava como mudança,
    // então 245 de 281 pacotes entravam na conta toda hora, o freio de massa
    // disparava para sempre, o custo novo nunca era gravado e o painel ficava
    // vermelho de hora em hora sem nenhum risco real ao cliente.
    const custoAntigo = Number(r.cost_brl ?? 0);
    const custoNovo = patch.cost_brl !== undefined ? Number(patch.cost_brl) : custoAntigo;
    const variacao = custoAntigo > 0 ? Math.abs(custoNovo / custoAntigo - 1) : (custoNovo > 0 ? 1 : 0);
    // v316 — CAUSA RAIZ DO IMPASSE. Antes bastava `patch.is_sellable !== undefined`
    // para o pacote contar como "mudou". Só que o motor reescreve is_sellable=false
    // em TODO ciclo para pacote que já estava pausado — mesmo valor, zero mudança
    // real. Resultado: 192 de 281 pacotes entravam na conta toda hora, o freio de
    // massa (>30%) disparava para sempre, NADA era gravado, e os pacotes pausados
    // ficavam pausados eternamente porque a correção nunca chegava a ser aplicada.
    // Loop que se alimenta sozinho: 51 alertas críticos em 48h e prateleira travada.
    // Agora só conta como mudança quando o valor novo é DIFERENTE do valor atual.
    const mudouSellable = patch.is_sellable !== undefined && patch.is_sellable !== r.is_sellable;
    plans.push({
      pacote: r.pacote,
      patch,
      priceKeys,
      movesPrice: variacao > MOVE_THRESHOLD || mudouSellable,
      restoredPacote,
    });
  }

  // v305 — A trava de escada saiu daqui de propósito. Este motor não decide
  // mais preço: quem fecha o ciclo é a autoridade única
  // (`price-authority.server.ts`), que lê o banco depois de todos gravarem
  // custo e aplica margem + escada juntas, uma vez só.


  // v275 — FASE 2: mede o estrago ANTES de gravar.
  // Se mais de 30% do catálogo mudaria de preço no mesmo ciclo, isso não é
  // reajuste de fornecedor: é leitura ruim (catálogo incompleto/câmbio).
  // Nesse caso a alteração vai para QUARENTENA: nada de preço é gravado.
  // Só libera quando a MESMA leitura se repetir no ciclo seguinte
  // (confirmação por segunda leitura) ou o dono aprovar no admin.
  const scannedTotal = ((rows as any[]) ?? []).length || 1;
  const movers = plans.filter((p) => p.movesPrice);
  const leituraSuspeitaBruta = movers.length > scannedTotal * MASS_CHANGE_RATIO;

  const assinatura = await hashSignature(
    movers
      // v311 — a assinatura precisa refletir o que ESTE motor grava: custo.
      // Antes usava price_brl, que a v305 parou de gravar aqui: toda leitura
      // virava "-1.00", a confirmação por segunda leitura nunca fechava e a
      // quarentena nunca liberava. Custo arredondado em centavo estabiliza.
      .map((p) => `${p.pacote}:${Number(p.patch.cost_brl ?? -1).toFixed(2)}:${p.patch.is_sellable === false ? "off" : "on"}`)
      .sort()
      .join("|"),
  );
  const q = await readQuarantine(supabaseAdmin);
  const confirmadaPorSegundaLeitura = leituraSuspeitaBruta && q?.signature === assinatura;
  const aprovadaManual = leituraSuspeitaBruta && q?.approved === true && q?.signature === assinatura;
  const emQuarentena = leituraSuspeitaBruta && !confirmadaPorSegundaLeitura && !aprovadaManual;

  if (leituraSuspeitaBruta) {
    await writeQuarantine(supabaseAdmin, {
      signature: assinatura,
      total: movers.length,
      scanned: scannedTotal,
      applied: !emQuarentena,
      approved: aprovadaManual ? false : (q?.signature === assinatura ? q?.approved === true : false),
      last_alert_at: q?.signature === assinatura ? (q?.last_alert_at ?? null) : null,
      updated_at: new Date().toISOString(),
      amostra: movers.slice(0, 20).map((p) => ({ pacote: p.pacote, para: Number(p.patch.cost_brl ?? 0) })),
    });
  } else if (q) {
    await clearQuarantine(supabaseAdmin);
  }

  // v275 — FASE 3: grava. Em quarentena só os campos de ID fantasma passam.
  // v277 — Gravação em LOTE. Antes era 1 UPDATE por pacote (281 round-trips por
  // ciclo → 362 mil UPDATEs acumulados). Agora agrupa os patches que mexem nas
  // MESMAS colunas e manda um upsert só por grupo. Mesmo resultado, ~30x menos
  // ida-e-volta no banco. Os pacotes vêm de um SELECT desta mesma tabela, então
  // o upsert sempre cai no caminho de conflito (UPDATE), nunca insere linha nova.
  const grupos = new Map<string, Array<Record<string, any>>>();
  const planosPorPacote = new Map<string, (typeof plans)[number]>();

  for (const plan of plans) {
    const patch = { ...plan.patch };
    if (emQuarentena) {
      for (const k of plan.priceKeys) delete patch[k];
      if (Object.keys(patch).length === 0) continue;
    }
    const chave = Object.keys(patch).sort().join(",");
    const lote = grupos.get(chave) ?? [];
    lote.push({ pacote: plan.pacote, ...patch });
    grupos.set(chave, lote);
    planosPorPacote.set(plan.pacote, plan);
  }

  const CHUNK = 200;
  for (const lote of grupos.values()) {
    for (let i = 0; i < lote.length; i += CHUNK) {
      const fatia = lote.slice(i, i + CHUNK);
      const { error } = await supabaseAdmin
        .from("pricing_items" as any)
        .upsert(fatia, { onConflict: "pacote" });
      if (error) {
        // Falhou o lote inteiro: cai para linha-a-linha para não perder tudo
        // por causa de um único pacote problemático.
        console.error("[pricing-cache] v277 lote falhou, aplicando 1 a 1", error.message);
        for (const row of fatia) {
          const { pacote, ...patch } = row;
          const { error: e1 } = await supabaseAdmin
            .from("pricing_items" as any)
            .update(patch)
            .eq("pacote", pacote);
          if (e1) {
            console.error("[pricing-cache] v277 UPDATE falhou", { pacote, error: e1.message });
            continue;
          }
          contabiliza(row);
        }
        continue;
      }
      for (const row of fatia) contabiliza(row);
    }
  }

  function contabiliza(row: Record<string, any>) {
    if (row.price_brl !== undefined || row.cost_brl !== undefined) updated_rows++;
    const plan = planosPorPacote.get(String(row.pacote));
    if (plan?.restoredPacote && row.is_sellable === true) restored.push(plan.restoredPacote);
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

  // v275 — Alerta honesto: "mudariam" só quando realmente NÃO aplicou.
  // Freio anti-spam: mesma leitura suspeita só alerta 1x a cada 6h.
  const jaAlertouRecente =
    emQuarentena &&
    q?.signature === assinatura &&
    q?.last_alert_at != null &&
    Date.now() - Date.parse(q.last_alert_at) < ALERT_COOLDOWN_MS;

  if ((repriced.length > 0 || emQuarentena) && !jaAlertouRecente) {
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      const base = emQuarentena ? movers : plans.filter((p) => p.movesPrice);
      const amostraQ = base
        .slice(0, 8)
        .map((p) => `• ${p.pacote} → custo R$ ${Number(p.patch.cost_brl ?? 0).toFixed(2)}`)
        .join("\n");
      const amostra = repriced
        .slice(0, 8)
        .map((x) => `• ${x.pacote}: R$ ${x.de.toFixed(2)} → R$ ${x.para.toFixed(2)} (${x.fornecedor})`)
        .join("\n");
      const msg = emQuarentena
        ? `⚠️ MUDANÇA DE PREÇO EM MASSA BLOQUEADA\n\nPROBLEMA: ${movers.length} de ${scannedTotal} pacotes mudariam de preço no mesmo ciclo. Isso quase sempre é leitura errada do fornecedor. NENHUM preço do site foi alterado e nada saiu da vitrine.\n\n${amostraQ}\n\nO QUE FAZER: nada urgente. Se a próxima leitura vier igual, o sistema aplica sozinho. Se quiser aplicar agora, aprovar no admin.`
        : `💰 PREÇOS DO SITE MUDARAM SOZINHOS\n\nPROBLEMA: o fornecedor mexeu forte no custo de ${repriced.length} pacote(s). Reajuste pequeno já entrou sozinho; pacote que ficaria caro demais foi TIRADO DA VITRINE em vez de mudar o preço na cara do cliente.\n\n${amostra}\n\nO QUE FAZER: no admin, trocar o fornecedor desse pacote, aceitar o preço novo ou aposentar o pacote.`;
      // v311 — quarentena é PROTEÇÃO que funcionou: nada mudou de preço, nada
      // saiu da vitrine, cliente não corre risco. Vira aviso, não vermelho.
      await dispatchWhatsappAlert(msg, emQuarentena ? { severity: "warning" } : {}).catch(() => {});
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: "system@sync",
        action: emQuarentena ? "preco_massa_bloqueado_v275" : "reprecificacao_forte_v266",
        detail: {
          total: emQuarentena ? movers.length : repriced.length,
          scanned: scannedTotal,
          assinatura,
          itens: repriced.slice(0, 50),
        } as any,
      });
      if (emQuarentena) {
        await writeQuarantine(supabaseAdmin, {
          signature: assinatura,
          total: movers.length,
          scanned: scannedTotal,
          applied: false,
          approved: false,
          last_alert_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          amostra: movers.slice(0, 20).map((p) => ({ pacote: p.pacote, para: Number(p.patch.cost_brl ?? 0) })),
        });
      }
    } catch { /* noop */ }
  }

  // v282 — Aviso em destaque: reajuste automático, aposentadoria e volta ao normal.
  // Só faz sentido quando os preços realmente foram gravados (fora da quarentena).
  if (!emQuarentena && (reajustados.length > 0 || aposentados.length > 0 || restored.length > 0)) {
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      const linhas = (arr: typeof reajustados) =>
        arr.slice(0, 8).map((x) => `• ${x.pacote}: R$ ${x.de.toFixed(2)} → R$ ${x.para.toFixed(2)} (${x.fornecedor})`).join("\n");

      const partes: string[] = [];
      if (reajustados.length > 0) {
        partes.push(
          `🔺 PREÇO SUBIU SOZINHO (dentro do limite de 40%)\n\nPROBLEMA: o fornecedor encareceu ${reajustados.length} pacote(s). O site já está com o preço novo e a margem segue protegida.\n\n${linhas(reajustados)}\n\nO QUE FAZER: nada agora. Se um cliente perguntar, a explicação é: "o custo do serviço subiu no fornecedor e reajustamos para manter a mesma qualidade de entrega".`,
        );
      }
      if (aposentados.length > 0) {
        partes.push(
          `⛔ PACOTE APOSENTADO (custo disparou mais de 80%)\n\nPROBLEMA: ${aposentados.length} pacote(s) ficaram caros demais e saíram da vitrine em vez de subir o preço na cara do cliente.\n\n${linhas(aposentados)}\n\nO QUE FAZER: escolher outro fornecedor para esse pacote no admin, ou deixar aposentado.`,
        );
      }
      if (restored.length > 0) {
        partes.push(
          `✅ PACOTE VOLTOU AO NORMAL\n\nPROBLEMA: nenhum. O custo caiu de novo e ${restored.length} pacote(s) voltaram para a vitrine com preço menor.\n\n${restored.slice(0, 8).map((p) => `• ${p}`).join("\n")}\n\nO QUE FAZER: nada. Só avisando para você saber que o preço baixou.`,
        );
      }

      await dispatchWhatsappAlert(partes.join("\n\n———\n\n")).catch(() => {});
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: "system@sync",
        action: "reajuste_automatico_v282",
        detail: {
          teto_automatico: AUTO_UP_MAX,
          teto_aposentadoria: RETIRE_ABOVE,
          reajustados: reajustados.slice(0, 50),
          aposentados: aposentados.slice(0, 50),
          voltaram: restored.slice(0, 50),
        } as any,
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

  console.log("[pricing-cache] v267 canonical sync", {
    providers: perProvider,
    scanned: ((rows as any[]) ?? []).length,
    updated_rows,
    ghosts: ghostList.length,
    restored: restored.length,
  });

  lastReserveSyncAt = Date.now();
  purgePricingCacheMemory("syncReserveProviderIds:end");

  return {
    skipped: false,
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
    restored: restored.length,
    restored_pacotes: restored.slice(0, 50),
  };
}
