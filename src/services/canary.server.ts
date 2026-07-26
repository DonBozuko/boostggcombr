// v281 — PEDIDO CANÁRIO (prova de entrega real)
//
// Por que existe: teste verde só prova fórmula. O canário prova ENTREGA.
// A cada X horas o sistema compra de verdade um pacote mínimo no fornecedor
// mais barato, apontando para um perfil de teste do próprio dono, e acompanha
// até remains=0. Se não entregar dentro do prazo, alerta ANTES do cliente reclamar.
//
// Nada de fake: se não houver perfil de teste configurado, o canário NÃO roda e
// diz claramente que está desligado.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Um alvo = uma rede. Link de Instagram não serve para YouTube/TikTok/Telegram,
 *  por isso cada rede tem seu próprio perfil/link de teste. */
export type CanaryAlvo = {
  rede: string;          // rótulo livre: instagram, tiktok, youtube, telegram, kwai, facebook, trafego
  link: string;          // perfil/URL de teste válido PARA ESSA REDE
  pacote: string;        // pacote real do catálogo dessa rede
  quantidade: number;    // menor quantidade possível
  ativo: boolean;
};

export type CanaryConfig = {
  enabled: boolean;
  alvos: CanaryAlvo[];
  interval_hours: number;
  sla_hours: number;     // prazo máximo para entregar antes de alertar
};

const DEFAULTS: CanaryConfig = {
  enabled: false,
  alvos: [],
  interval_hours: 12,
  sla_hours: 6,
};

function normAlvo(a: Partial<CanaryAlvo>): CanaryAlvo {
  return {
    rede: String(a.rede ?? "").trim(),
    link: String(a.link ?? "").trim(),
    pacote: String(a.pacote ?? "").trim(),
    quantidade: Number(a.quantidade ?? 0) || 0,
    ativo: a.ativo !== false,
  };
}

export function alvoValido(a: CanaryAlvo): boolean {
  return Boolean(a.ativo && a.link && a.pacote && a.quantidade > 0);
}

export async function getCanaryConfig(): Promise<CanaryConfig> {
  const { data } = await supabaseAdmin
    .from("admin_settings")
    .select("value")
    .eq("key", "canary_config")
    .maybeSingle();
  const v = (data as { value?: Record<string, unknown> } | null)?.value ?? {};

  let alvos: CanaryAlvo[] = Array.isArray(v.alvos)
    ? (v.alvos as Partial<CanaryAlvo>[]).map(normAlvo)
    : [];

  // Compatibilidade: configuração antiga tinha um único link/pacote/quantidade.
  if (alvos.length === 0 && v.link && v.pacote) {
    alvos = [normAlvo({ rede: "instagram", link: String(v.link), pacote: String(v.pacote), quantidade: Number(v.quantidade ?? 0), ativo: true })];
  }

  return {
    enabled: Boolean(v.enabled),
    alvos,
    interval_hours: Number(v.interval_hours ?? DEFAULTS.interval_hours) || DEFAULTS.interval_hours,
    sla_hours: Number(v.sla_hours ?? DEFAULTS.sla_hours) || DEFAULTS.sla_hours,
  };
}


type ProviderStatus = { status?: string; remains?: string | number; error?: string };

async function fetchProviderStatus(slug: string, orderId: string): Promise<ProviderStatus | null> {
  const { data: f } = await supabaseAdmin
    .from("fornecedores")
    .select("api_url, api_key_secret")
    .eq("slug", slug)
    .maybeSingle();
  const url = (f as { api_url?: string } | null)?.api_url;
  const key = f ? process.env[(f as { api_key_secret?: string }).api_key_secret ?? ""] : undefined;
  if (!url || !key) return { error: `config ausente para ${slug}` };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ key, action: "status", order: String(orderId) }).toString(),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return (await res.json()) as ProviderStatus;
  } catch (e) {
    return { error: (e as Error).message };
  }
}

async function alert(msg: string): Promise<void> {
  try {
    const { dispatchWhatsappAlert } = await import("@/lib/whatsapp-alert.server");
    await dispatchWhatsappAlert(msg).catch(() => {});
  } catch { /* noop */ }
}

export type CanaryReport = {
  ok: boolean;
  ligado: boolean;
  motivo?: string;
  novo_pedido?: { id: string; fornecedor: string; ordem: string; pacote: string; quantidade: number };
  verificados: Array<{ id: string; fornecedor: string; ordem: string; resultado: string }>;
  alertas: string[];
  ts: string;
};

/** Fase 1 — acompanha canários abertos e fecha/alerta. */
async function checkOpenRuns(cfg: CanaryConfig, report: CanaryReport): Promise<void> {
  const { data } = await supabaseAdmin
    .from("canary_runs")
    .select("id, provider_slug, provider_order_id, quantidade, created_at, status")
    .in("status", ["dispatched", "processing"])
    .limit(20);

  for (const r of (data as any[]) ?? []) {
    if (!r.provider_slug || !r.provider_order_id) continue;
    const s = await fetchProviderStatus(r.provider_slug, r.provider_order_id);
    const ageH = (Date.now() - new Date(r.created_at).getTime()) / 3_600_000;

    if (!s || s.error) {
      report.verificados.push({ id: r.id, fornecedor: r.provider_slug, ordem: r.provider_order_id, resultado: `erro: ${s?.error}` });
      await supabaseAdmin.from("canary_runs").update({ last_checked_at: new Date().toISOString(), detail: `erro consulta: ${s?.error}` }).eq("id", r.id);
      continue;
    }

    const remains = Number(s.remains ?? -1);
    const st = String(s.status ?? "").toLowerCase();
    const delivered = (Number.isFinite(remains) && remains === 0) || ["completed", "concluído", "concluido"].includes(st);
    // v287 — "partial" NÃO é cancelamento: o fornecedor entregou parte e devolveu
    // o resto. Antes caía no mesmo balde de "cancelado sem entregar" e disparava
    // alarme falso de sistema quebrado. Também damos 30min de carência porque
    // vários painéis marcam Partial no começo e depois completam.
    const canceled = ["canceled", "cancelled", "refunded"].includes(st) && remains > 0;
    const partial = st === "partial" && remains > 0;
    const partialGraceH = 0.5;


    if (delivered) {
      await supabaseAdmin.from("canary_runs").update({
        status: "delivered", remains: 0, delivered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(), detail: `entregue em ${ageH.toFixed(1)}h`,
      }).eq("id", r.id);
      report.verificados.push({ id: r.id, fornecedor: r.provider_slug, ordem: r.provider_order_id, resultado: `ENTREGUE (${ageH.toFixed(1)}h)` });
      continue;
    }

    if (canceled) {
      await supabaseAdmin.from("canary_runs").update({
        status: "failed", remains: Number.isFinite(remains) ? remains : null,
        last_checked_at: new Date().toISOString(), detail: `fornecedor devolveu status ${st}`,
      }).eq("id", r.id);
      const m = `🚨 ENTREGA NÃO ESTÁ FUNCIONANDO\n\nPROBLEMA: o pedido de teste automático (${r.provider_slug}) foi cancelado pelo fornecedor sem entregar.\n\nO QUE FAZER: abrir /admin e conferir o fornecedor ${r.provider_slug} antes que um cliente real compre.`;
      report.alertas.push(m); await alert(m);
      report.ok = false;
      continue;
    }

    if (partial) {
      // Dentro da carência: ainda pode completar. Só registra e volta depois.
      if (ageH < partialGraceH) {
        await supabaseAdmin.from("canary_runs").update({
          status: "processing", remains, last_checked_at: new Date().toISOString(),
          detail: `parcial (faltam ${remains}) — aguardando`,
        }).eq("id", r.id);
        report.verificados.push({ id: r.id, fornecedor: r.provider_slug, ordem: r.provider_order_id, resultado: `parcial (faltam ${remains})` });
        continue;
      }
      const entregue = Math.max(0, Number(r.quantidade || 0) - remains);
      await supabaseAdmin.from("canary_runs").update({
        status: "partial", remains, last_checked_at: new Date().toISOString(),
        detail: `entrega parcial: ${entregue} de ${r.quantidade}`,
      }).eq("id", r.id);
      const m = `⚠️ ENTREGA SAIU PELA METADE\n\nPROBLEMA: no teste de compra real o fornecedor ${r.provider_slug} entregou só ${entregue} de ${r.quantidade} e devolveu o resto.\n\nO QUE FAZER: o site continua vendendo (outros fornecedores estão OK), mas confira ${r.provider_slug} no /admin — se repetir, é melhor pausar esse fornecedor.`;
      report.alertas.push(m); await alert(m);
      report.ok = false;
      continue;
    }



    if (ageH > cfg.sla_hours) {
      await supabaseAdmin.from("canary_runs").update({
        status: "stuck", remains: Number.isFinite(remains) ? remains : null,
        last_checked_at: new Date().toISOString(), detail: `sem entregar há ${ageH.toFixed(1)}h`,
      }).eq("id", r.id);
      const m = `🚨 ENTREGA ATRASADA NO FORNECEDOR\n\nPROBLEMA: o pedido de teste automático em ${r.provider_slug} está há ${ageH.toFixed(1)}h sem entregar (faltam ${Number.isFinite(remains) ? remains : "?"} de ${r.quantidade}).\n\nO QUE FAZER: se um cliente comprar agora, pode não receber. Conferir o fornecedor ${r.provider_slug} no /admin.`;
      report.alertas.push(m); await alert(m);
      report.ok = false;
      continue;
    }

    await supabaseAdmin.from("canary_runs").update({
      status: "processing", remains: Number.isFinite(remains) ? remains : null, last_checked_at: new Date().toISOString(),
    }).eq("id", r.id);
    report.verificados.push({ id: r.id, fornecedor: r.provider_slug, ordem: r.provider_order_id, resultado: `processando (faltam ${remains})` });
  }
}

/** Fase 2 — dispara um novo canário na rede que está há mais tempo sem teste.
 *  Cada rede tem seu próprio link/pacote: rotaciona um alvo por execução.
 *  v285 — agora exercita o MESMO failover de um pedido real: percorre a cadeia
 *  inteira de fornecedores e só alerta se TODOS falharem. Antes o canário testava
 *  só o mais barato, o que gerava alarme falso sempre que o primeiro recusava
 *  (o cliente real failover e entrega normalmente). */
async function maybeDispatch(cfg: CanaryConfig, report: CanaryReport): Promise<void> {
  const alvos = cfg.alvos.filter(alvoValido);
  if (alvos.length === 0) return;

  const { data: recent } = await supabaseAdmin
    .from("canary_runs")
    .select("pacote, created_at, status")
    .order("created_at", { ascending: false })
    .limit(200);

  const lastByPacote = new Map<string, number>();
  const activeByPacote = new Set<string>();
  for (const row of ((recent as any[]) ?? [])) {
    if (!lastByPacote.has(row.pacote)) lastByPacote.set(row.pacote, new Date(row.created_at).getTime());
    if ((row.status === "dispatched" || row.status === "processing") && !activeByPacote.has(row.pacote)) {
      activeByPacote.add(row.pacote);
    }
  }

  // O alvo mais "velho" (ou nunca testado) é o próximo da fila.
  const alvo = [...alvos].sort(
    (a, b) => (lastByPacote.get(a.pacote) ?? 0) - (lastByPacote.get(b.pacote) ?? 0),
  )[0];

  const lastAt = lastByPacote.get(alvo.pacote) ?? 0;
  // v286 — piso anti-duplicado de link: fornecedores (SMMhype etc.) rejeitam
  // "active order with this link" se um pedido recente ainda não liberou o link.
  // Mesmo com force (interval_hours=0) mantemos 10 min de piso entre disparos do
  // mesmo alvo, senão o canário dispara alarme falso de "entrega quebrada".
  const minGapMs = 10 * 60_000;
  if (lastAt > 0 && Date.now() - lastAt < Math.max(cfg.interval_hours * 3_600_000, minGapMs)) return;

  // v286 — anti-alarme-falso: se já existe canário em andamento (dispatched/processing)
  // para este alvo, NÃO dispara outro pedido pro mesmo link. Fornecedores como o
  // SMMhype recusam duplicado ("active order with this link") e isso dispararia um
  // alerta falso de "entrega quebrada". A Fase 1 (checkOpenRuns) cuida do acompanhamento.
  if (activeByPacote.has(alvo.pacote)) return;

  const rede = alvo.rede || alvo.pacote;

  const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
  const ranked = await rankProvidersByCost({ pacote: alvo.pacote, quantidade: alvo.quantidade });

  // Cadeia apta: fornecedores ativos, não instáveis, com ID real (smmhype usa
  // resolver interno, então dispensa provider_service_id).
  const cadeia = ranked.filter((p) => !p.unstable && (p.slug === "smmhype" || p.provider_service_id));
  if (cadeia.length === 0) {
    report.ok = false;
    const m = `🚨 NENHUM FORNECEDOR DISPONÍVEL\n\nPROBLEMA: o teste de compra real não achou fornecedor apto para o pacote ${alvo.pacote} (${rede}).\n\nO QUE FAZER: abrir /admin e conferir fornecedores e IDs do catálogo.`;
    report.alertas.push(m); await alert(m);
    return;
  }

  const { dispatchByFornecedor } = await import("@/lib/dispatcher-fallback.server");
  const tentativas: string[] = [];

  for (const cand of cadeia) {
    const r = await dispatchByFornecedor(cand.slug, {
      pacote: alvo.pacote,
      quantidade: alvo.quantidade,
      instagram_user: alvo.link,
      // smmhype resolve o serviceId internamente; demais usam o ID curado/auto.
      serviceIdOverride: cand.slug === "smmhype" ? undefined : cand.provider_service_id,
    });

    if (!r.ok) {
      tentativas.push(`${cand.slug}: ${r.error ?? "falha"}`);
      // dispatchByFornecedor já acionou o circuit breaker interno; continua pro próximo.
      continue;
    }

    const { data: ins } = await supabaseAdmin
      .from("canary_runs")
      .insert({
        pacote: alvo.pacote,
        quantidade: alvo.quantidade,
        target_link: alvo.link,
        provider_slug: cand.slug,
        cost_brl: cand.cost_brl,
        status: "dispatched",
        provider_order_id: String(r.orderId),
        detail: `[${rede}] enviado via ${cand.slug}${tentativas.length ? ` (após falha de ${tentativas.length} fornecedor[es])` : ""}`,
      } as any)
      .select("id")
      .maybeSingle();

    report.novo_pedido = {
      id: String((ins as any)?.id ?? ""),
      fornecedor: cand.slug,
      ordem: String(r.orderId),
      pacote: alvo.pacote,
      quantidade: alvo.quantidade,
    };
    return; // sucesso — entrega em andamento
  }

  // Se chegou aqui: TODOS os fornecedores da cadeia falharam = entrega real quebrada.
  const base = {
    pacote: alvo.pacote,
    quantidade: alvo.quantidade,
    target_link: alvo.link,
    provider_slug: cadeia[0]?.slug ?? null,
    cost_brl: cadeia[0]?.cost_brl ?? null,
  };
  await supabaseAdmin.from("canary_runs").insert({ ...base, status: "failed", detail: `[${rede}] TODOS falharam: ${tentativas.join(" | ")}` } as any);
  report.ok = false;
  const m = `🚨 ENTREGA REAL QUEBRADA\n\nPROBLEMA: o teste de compra real (${rede} · ${alvo.pacote}) falhou em TODOS os ${cadeia.length} fornecedores:\n${tentativas.map((t) => `• ${t}`).join("\n")}\n\nO QUE FAZER: cliente que comprar esse pacote agora NÃO vai receber. Abrir /admin e conferir fornecedores antes de qualquer venda.`;
  report.alertas.push(m); await alert(m);
}

export async function runCanary(force = false): Promise<CanaryReport> {
  const report: CanaryReport = { ok: true, ligado: false, verificados: [], alertas: [], ts: new Date().toISOString() };
  const cfg = await getCanaryConfig();

  if (!cfg.enabled || cfg.alvos.filter(alvoValido).length === 0) {
    report.motivo = "canário desligado: nenhuma rede com perfil de teste, pacote e quantidade configurados";
    return report;
  }
  report.ligado = true;


  await checkOpenRuns(cfg, report);
  if (force) {
    await maybeDispatch({ ...cfg, interval_hours: 0 }, report);
  } else {
    await maybeDispatch(cfg, report);
  }

  try {
    await supabaseAdmin.from("admin_audit_logs").insert({
      admin_email: "system@canary",
      action: "canary_run_v281",
      detail: report as any,
    } as any);
  } catch { /* noop */ }

  return report;
}
