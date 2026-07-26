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

async function syncReserveProviderIdsNow(_opts: { force: boolean }) {
  purgePricingCacheMemory(_opts.force ? "v266-force-live-handshake" : "v266-lazy-live-handshake");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (!(await acquireSyncLock(supabaseAdmin))) {
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

    const patch: Record<string, unknown> = {};
    if (nextStreak !== prevStreak) patch.id_miss_streak = nextStreak;
    if ((missSince ?? null) !== (r.id_miss_since ?? null)) patch.id_miss_since = missSince;

    if (costs.length > 0) {
      const best = costs.reduce((a, b) => (b.cost < a.cost ? b : a));
      const newCost = best.cost;
      const newPrice = computeGuardedPrice(newCost, qty); // Equação Fabiano Tiered v173
      const oldPrice = Number(r.price_brl ?? 0);
      const oldCost = Number(r.cost_brl ?? 0);
      const costChanged = Math.abs(newCost - oldCost) > 0.0001;
      const priceChanged = Math.abs(newPrice - oldPrice) > 0.009;
      // v271 — O gatilho de pausa agora olha CUSTO contra CUSTO.
      // Antes comparava preço novo contra preço antigo, e isso pausava pacote
      // saudável sempre que o piso escalar subia (ex.: l200 R$5,00 → R$7,67 com
      // custo de R$0,05). Pausa só quando o fornecedor realmente encareceu.
      const saltoCusto = oldCost > 0 ? newCost / oldCost : 1;
      const saltoPreco = oldPrice > 0 ? newPrice / oldPrice : 1;
      const encareceuDeVerdade = saltoCusto > 1.5 && saltoPreco > 1.5;

      if (costChanged || priceChanged) {
        patch.cost_brl = newCost;
        patch.last_cost_source = best.slug;
        patch.synced_at = new Date().toISOString();

        if (!encareceuDeVerdade) {
          patch.price_brl = newPrice;
          // v271 — só avisa queda real de custo (≥40%), não oscilação de piso.
          if (oldCost > 0 && saltoCusto <= 0.6) {
            repriced.push({ pacote: r.pacote, de: oldPrice, para: newPrice, fornecedor: best.slug });
          }
        } else {
          // v271 — Salto violento: NÃO sobrescreve o preço da vitrine. O pacote
          // sai de venda e o preço justo sugerido fica registrado no motivo.
          // Sobrescrever o preço fazia o próximo ciclo comparar contra um valor
          // inflado e disparar alerta de novo, em looping.
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
    plans.push({
      pacote: r.pacote,
      patch,
      priceKeys,
      movesPrice: patch.price_brl !== undefined || patch.is_sellable !== undefined,
      restoredPacote,
    });
  }

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
      .map((p) => `${p.pacote}:${Number(p.patch.price_brl ?? -1).toFixed(2)}:${p.patch.is_sellable === false ? "off" : "on"}`)
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
      amostra: movers.slice(0, 20).map((p) => ({ pacote: p.pacote, para: Number(p.patch.price_brl ?? 0) })),
    });
  } else if (q) {
    await clearQuarantine(supabaseAdmin);
  }

  // v275 — FASE 3: grava. Em quarentena só os campos de ID fantasma passam.
  for (const plan of plans) {
    const patch = { ...plan.patch };
    if (emQuarentena) {
      for (const k of plan.priceKeys) delete patch[k];
      if (Object.keys(patch).length === 0) continue;
    }
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .update(patch)
      .eq("pacote", plan.pacote);
    if (error) {
      console.error("[pricing-cache] v275 UPDATE falhou", { pacote: plan.pacote, error: error.message });
      continue;
    }
    if (patch.price_brl !== undefined || patch.cost_brl !== undefined) updated_rows++;
    if (plan.restoredPacote && patch.is_sellable === true) restored.push(plan.restoredPacote);
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

  // v271 — Alerta de reprecificação forte, com freio anti-spam.
  // Se metade do catálogo "mudou de preço" de uma vez, isso não é o fornecedor
  // reajustando: é leitura ruim (catálogo incompleto/câmbio). Nesse caso avisa
  // UMA vez que a leitura está suspeita, em vez de despejar lista de preços.
  const scannedTotal = ((rows as any[]) ?? []).length || 1;
  const leituraSuspeita = repriced.length > scannedTotal * 0.3;
  if (repriced.length > 0) {
    try {
      const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
      const amostra = repriced
        .slice(0, 8)
        .map((x) => `• ${x.pacote}: R$ ${x.de.toFixed(2)} → R$ ${x.para.toFixed(2)} (${x.fornecedor})`)
        .join("\n");
      const msg = leituraSuspeita
        ? `⚠️ LEITURA DE PREÇO SUSPEITA\n\nPROBLEMA: ${repriced.length} de ${scannedTotal} pacotes mudariam de preço de uma vez só. Isso quase sempre é falha de leitura do fornecedor, não reajuste real. Nada foi tirado da vitrine em massa.\n\n${amostra}\n\nO QUE FAZER: me avisa. Vou conferir se algum fornecedor devolveu catálogo incompleto ou cotação errada.`
        : `💰 PREÇOS DO SITE MUDARAM SOZINHOS\n\nPROBLEMA: o fornecedor mexeu forte no custo de ${repriced.length} pacote(s). Reajuste pequeno já entrou sozinho; pacote que ficaria caro demais foi TIRADO DA VITRINE em vez de mudar o preço na cara do cliente.\n\n${amostra}\n\nO QUE FAZER: no admin, trocar o fornecedor desse pacote, aceitar o preço novo ou aposentar o pacote.`;
      await dispatchWhatsappAlert(msg).catch(() => {});
      await supabaseAdmin.from("admin_audit_logs" as any).insert({
        admin_email: "system@sync",
        action: leituraSuspeita ? "leitura_preco_suspeita_v271" : "reprecificacao_forte_v266",
        detail: { total: repriced.length, scanned: scannedTotal, itens: repriced.slice(0, 50) } as any,
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
