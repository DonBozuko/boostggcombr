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
    const canceled = ["canceled", "cancelled", "refunded", "partial"].includes(st) && remains > 0;

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
 *  Cada rede tem seu próprio link/pacote: rotaciona um alvo por execução. */
async function maybeDispatch(cfg: CanaryConfig, report: CanaryReport): Promise<void> {
  const alvos = cfg.alvos.filter(alvoValido);
  if (alvos.length === 0) return;

  const { data: recent } = await supabaseAdmin
    .from("canary_runs")
    .select("pacote, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const lastByPacote = new Map<string, number>();
  for (const row of ((recent as any[]) ?? [])) {
    if (!lastByPacote.has(row.pacote)) lastByPacote.set(row.pacote, new Date(row.created_at).getTime());
  }

  // O alvo mais "velho" (ou nunca testado) é o próximo da fila.
  const alvo = [...alvos].sort(
    (a, b) => (lastByPacote.get(a.pacote) ?? 0) - (lastByPacote.get(b.pacote) ?? 0),
  )[0];

  const lastAt = lastByPacote.get(alvo.pacote) ?? 0;
  if (Date.now() - lastAt < cfg.interval_hours * 3_600_000) return;

  const rede = alvo.rede || alvo.pacote;

  const { rankProvidersByCost } = await import("@/lib/smart-routing.server");
  const ranked = await rankProvidersByCost({ pacote: alvo.pacote, quantidade: alvo.quantidade });
  const candidate = ranked.find((p) => !p.unstable && p.provider_service_id);
  if (!candidate) {
    report.ok = false;
    const m = `🚨 NENHUM FORNECEDOR DISPONÍVEL\n\nPROBLEMA: o teste de compra real não achou fornecedor apto para o pacote ${alvo.pacote} (${rede}).\n\nO QUE FAZER: abrir /admin e conferir fornecedores e IDs do catálogo.`;
    report.alertas.push(m); await alert(m);
    return;
  }

  const { dispatchByFornecedor } = await import("@/lib/dispatcher-fallback.server");
  const r = await dispatchByFornecedor(candidate.slug, {
    pacote: alvo.pacote,
    quantidade: alvo.quantidade,
    instagram_user: alvo.link,
    serviceIdOverride: candidate.provider_service_id,
  });

  const base = {
    pacote: alvo.pacote,
    quantidade: alvo.quantidade,
    target_link: alvo.link,
    provider_slug: candidate.slug,
    cost_brl: candidate.cost_brl,
  };

  if (!r.ok) {
    await supabaseAdmin.from("canary_runs").insert({ ...base, status: "failed", detail: `[${rede}] ${r.error ?? "falha desconhecida"}` } as any);
    report.ok = false;
    const m = `🚨 COMPRA DE TESTE FALHOU\n\nPROBLEMA: o sistema tentou comprar de verdade em ${candidate.slug} (${rede}) e o fornecedor recusou: ${r.error}\n\nO QUE FAZER: cliente real que comprar esse pacote agora provavelmente também falha. Conferir /admin.`;
    report.alertas.push(m); await alert(m);
    return;
  }

  const { data: ins } = await supabaseAdmin
    .from("canary_runs")
    .insert({ ...base, status: "dispatched", provider_order_id: String(r.orderId), detail: `[${rede}] enviado` } as any)
    .select("id")
    .maybeSingle();

  report.novo_pedido = {
    id: String((ins as any)?.id ?? ""),
    fornecedor: candidate.slug,
    ordem: String(r.orderId),
    pacote: alvo.pacote,
    quantidade: alvo.quantidade,
  };
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
