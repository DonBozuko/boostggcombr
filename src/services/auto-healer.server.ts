// v172 — Auto-Healer & Injection Core
// Varredura clínica silenciosa dos 289 pacotes de pricing_items contra as 3 APIs
// (smmhype, smmpanel, verified). Detecta e conserta em runtime:
//   (a) ID inválido/defasado    → UPDATE direto na coluna *_service_id
//   (b) Preço com margem furada → delegado à autoridade única (v305)
//   (c) Provedor offline/zerado → seta provider_health.unstable_until
// Descarrega tudo em admin_audit_logs.


const PROVIDERS = [
  { slug: "smmhype",  endpoint: "https://smmhype.com/api/v2",         envKey: "SMMHYPE_API_KEY",   idCol: "smmhype_service_id" },
  { slug: "smmpainel", endpoint: "https://smmpainel.com/api/v2",       envKey: "SMMPAINEL_API_KEY", idCol: "smmpanel_service_id" },
  { slug: "verified",  endpoint: "https://verifiedatacado.com/api/v2", envKey: "VERIFIED_API_KEY",  idCol: "verified_service_id" },
] as const;

type ProviderService = { service: number | string; rate: number | string; name?: string };

type HealReport = {
  scanned: number;
  id_fixed: number;
  price_fixed: number;
  providers_marked_unstable: string[];
  errors: string[];
  ts: string;
};

async function fetchServices(endpoint: string, apiKey: string): Promise<ProviderService[] | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json,text/plain,*/*",
          "User-Agent": "EliteBoostPrime-AutoHealer/172",
        },
        body: new URLSearchParams({ key: apiKey, action: "services" }).toString(),
        signal: ctrl.signal,
      });
      if (!res.ok) return null;
      const parsed = JSON.parse(await res.text());
      return Array.isArray(parsed) ? (parsed as ProviderService[]) : null;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

export async function runAutoHealer(): Promise<HealReport> {
  const report: HealReport = {
    scanned: 0,
    id_fixed: 0,
    price_fixed: 0,
    providers_marked_unstable: [],
    errors: [],
    ts: new Date().toISOString(),
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { markProviderUnstable } = await import("@/lib/smart-routing.server");

  // 1) Snapshot pricing_items
  const { data: items, error: itemsErr } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, quantidade, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id");
  if (itemsErr || !items) {
    report.errors.push(`pricing_items load failed: ${itemsErr?.message ?? "unknown"}`);
    return report;
  }
  report.scanned = (items as any[]).length;

  // 2) Snapshot fornecedores + catálogos externos ao vivo
  const { data: forn } = await supabaseAdmin
    .from("fornecedores")
    .select("nome, slug, ativo, saldo_atual, cotacao_brl, api_url");
  const fornMap = new Map<string, { ativo: boolean; saldo: number; cot: number; nome: string; api_url: string | null }>();
  ((forn as any[]) ?? []).forEach((f) =>
    fornMap.set(f.slug, {
      ativo: !!f.ativo,
      saldo: Number(f.saldo_atual) || 0,
      cot: Number(f.cotacao_brl) || 7,
      nome: f.nome ?? f.slug,
      api_url: f.api_url ?? null,
    }),
  );


  const catalogs: Record<string, Map<string, ProviderService> | null> = {};
  for (const p of PROVIDERS) {
    const key = process.env[p.envKey];
    if (!key) { catalogs[p.slug] = null; continue; }
    const list = await fetchServices(p.endpoint, key);
    if (!list) {
      catalogs[p.slug] = null;
      await markProviderUnstable(p.slug, "auto-healer: catálogo indisponível");
      report.providers_marked_unstable.push(p.slug);
      continue;
    }
    const m = new Map<string, ProviderService>();
    for (const s of list) m.set(String(s.service), s);
    catalogs[p.slug] = m;

    // saldo zerado / inativo → marca unstable
    const f = fornMap.get(p.slug);
    if (f && (!f.ativo || f.saldo <= 0)) {
      await markProviderUnstable(p.slug, "auto-healer: fornecedor inativo/zerado");
      report.providers_marked_unstable.push(p.slug);
    }
  }

  // 3) Varredura por pacote
  for (const it of items as any[]) {
    // 3a) Auditar cada ID de fornecedor
    for (const p of PROVIDERS) {
      const cat = catalogs[p.slug];
      if (!cat) continue;
      const currentId = it[p.idCol] as string | null;
      if (!currentId) continue;
      if (cat.has(String(currentId))) continue;

      // ID quebrado — tentar reencontrar por nome-do-pacote via heurística mínima
      const pacote = String(it.pacote ?? "");
      const guess = [...cat.values()].find((s) =>
        String(s.name ?? "").toLowerCase().includes(pacote.toLowerCase()),
      );
      if (guess) {
        await supabaseAdmin
          .from("pricing_items" as any)
          .update({ [p.idCol]: String(guess.service), synced_at: new Date().toISOString() } as any)
          .eq("pacote", it.pacote);
        report.id_fixed++;
      } else {
        // ID órfão → zera para o smart-routing pular esta rota
        await supabaseAdmin
          .from("pricing_items" as any)
          .update({ [p.idCol]: null, synced_at: new Date().toISOString() } as any)
          .eq("pacote", it.pacote);
        report.errors.push(`ID órfão em ${pacote} (${p.slug}): ${currentId}`);
      }
    }

    // 3b) v305 — o auto-reparador NÃO grava mais preço.
    // Ele corrigia margem item-a-item ignorando a escada e o teto de reajuste,
    // reintroduzindo exatamente as inversões que o ciclo anterior tinha
    // consertado. Preço agora tem dono único: a autoridade roda no fim.
  }

  // v305 — fecha o ciclo do auto-reparo pela autoridade única de preço.
  try {
    const { enforcePriceAuthority } = await import("@/lib/price-authority.server");
    const auth = await enforcePriceAuthority("auto-healer");
    report.price_fixed += auth.applied;
  } catch (e) {
    report.errors.push(`autoridade de preço falhou: ${String((e as any)?.message ?? e)}`);
  }



  // 4) Alerta proativo — saldo pulmão crítico (< R$10 em qualquer fornecedor ativo)
  try {
    const criticos: string[] = [];
    const baixos: { nome: string; api_url: string | null; saldoBrl: number }[] = [];
    fornMap.forEach((f, slug) => {
      if (f.ativo && f.saldo > 0 && f.saldo < 10) {
        criticos.push(`${slug}: R$${f.saldo.toFixed(2)}`);
        baixos.push({ nome: f.nome, api_url: f.api_url, saldoBrl: f.saldo });
      }
    });
    if (criticos.length > 0) {
      const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
      // v298 — um botão de recarga por fornecedor afetado (só os que faltam saldo).
      const { buildTopupKeyboard } = await import("@/lib/provider-topup");
      const inlineKeyboard = buildTopupKeyboard(baixos);
      await dispatchWhatsappAlert(
        `⚠️ SALDO BAIXO NO FORNECEDOR\n\nPROBLEMA: fornecedor(es) quase sem dinheiro (menos de R$10).\n\n${criticos.join("\n")}\n\nO QUE FAZER: tocar no botão abaixo e recarregar agora, antes que novos pedidos comecem a falhar.`,
        inlineKeyboard.length ? { inlineKeyboard } : {},
      ).catch(() => {});
    }

  } catch (e: any) {
    report.errors.push(`alert failed: ${e?.message ?? "unknown"}`);
  }


  // 5) Log auditoria
  try {
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@auto-healer",
      action: "auto_healer_v172",
      detail: report as any,
      created_at: new Date().toISOString(),
    } as any);
  } catch (e: any) {
    report.errors.push(`audit log insert failed: ${e?.message ?? "unknown"}`);
  }

  return report;
}
