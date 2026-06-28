import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Leitura pública e mínima de status do pedido (id é UUID, difícil de adivinhar).
export const getPedidoStatus = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("pedidos")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) return { ok: false as const, status: null };

    // Contingência: se o webhook do MP ainda não chegou, consulta a API direta
    // e despacha o pedido para evitar o looping "Aguardando pagamento...".
    if (row.status === "pending") {
      try {
        const { confirmAndDispatchIfPaid } = await import("@/lib/payment-contingency.server");
        const r = await confirmAndDispatchIfPaid(data.id);
        if (r.ok) return { ok: true as const, status: r.status };
      } catch (e) {
        console.warn("[getPedidoStatus] contingency falhou", e);
      }
    }
    return { ok: true as const, status: row.status as string };
  });

// === ADMIN: listar pedidos pagos e reprocessar ===
const adminInput = z.object({ token: z.string().min(8) });

function checkToken(token: string) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  return token === expected;
}

export const listarPedidosPagos = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, created_at, status, pacote, quantidade, valor, instagram_user, mercado_pago_id, error_detail, rede_social")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, pedidos: rows ?? [] };
  });

// Lista pedidos com falha (SMM_FAILED, amount_mismatch, mp_rejected, etc) p/ auditoria.
export const listarPedidosFalhos = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, created_at, status, pacote, quantidade, instagram_user, mercado_pago_id, error_detail, rede_social")

      .or("status.eq.SMM_FAILED,status.eq.amount_mismatch,status.like.mp_%")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, pedidos: rows ?? [] };
  });

export const reprocessarPedido = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    adminInput.extend({ pedidoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pedido, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, status, pacote, quantidade, instagram_user")
      .eq("id", data.pedidoId)
      .maybeSingle();
    if (error || !pedido) return { ok: false as const, error: "NOT_FOUND" as const };
    if (pedido.status !== "paid" && pedido.status !== "SMM_FAILED")
      return { ok: false as const, error: `STATUS_${pedido.status}` as const };

    const { dispatchSmmhype } = await import("@/lib/smmhype.server");
    const smm = await dispatchSmmhype({
      pacote: pedido.pacote,
      quantidade: pedido.quantidade,
      instagram_user: pedido.instagram_user,
    });
    console.log("[reprocessar] resultado", { pedidoId: pedido.id, smm });
    if (!smm.ok) {
      const detail = `${smm.error}${smm.status ? ` (HTTP ${smm.status})` : ""}`.slice(0, 500);
      await supabaseAdmin
        .from("pedidos")
        .update({ status: "SMM_FAILED", error_detail: detail })
        .eq("id", pedido.id);
      return { ok: false as const, error: "SMM_FAILED" as const, detail: smm.error };
    }
    await supabaseAdmin
      .from("pedidos")
      .update({ status: "paid", error_detail: null })
      .eq("id", pedido.id);
    return { ok: true as const, orderId: smm.orderId ?? null };
  });

// Lista pedidos pendentes (Pix gerado, ainda não pago) com flag de notificação de abandono.
export const listarPedidosPendentes = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("id, created_at, status, pacote, quantidade, instagram_user, mercado_pago_id, abandono_notificado_at, rede_social")

      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    return { ok: true as const, pedidos: rows ?? [] };
  });

// Faturamento agregado por rede social (status=paid).
export const getFaturamentoPorRede = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("valor, rede_social")
      .eq("status", "paid");
    if (error) return { ok: false as const, error: "DB_FAILED" as const };
    const totais: Record<string, { total: number; count: number }> = {};
    let geral = 0;
    let count = 0;
    for (const r of rows ?? []) {
      const rede = (r as any).rede_social ?? "instagram";
      const v = Number((r as any).valor) || 0;
      totais[rede] = totais[rede] ?? { total: 0, count: 0 };
      totais[rede].total += v;
      totais[rede].count += 1;
      geral += v;
      count += 1;
    }
    return { ok: true as const, geral, count, totais };
  });

// Dry-run ping no SMMhype: valida que o token responde no endpoint /balance.
export const pingSmmhype = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const key = process.env.SMMHYPE_API_KEY;
    if (!key) return { ok: false as const, error: "SMMHYPE_API_KEY ausente" };
    try {
      const body = new URLSearchParams({ key, action: "balance" });
      const res = await fetch("https://smmhype.com/api/v2", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      const text = await res.text();
      let json: any = null;
      try { json = JSON.parse(text); } catch { /* */ }
      if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}`, body: text.slice(0, 200) };
      if (json?.error) return { ok: false as const, error: String(json.error), body: text.slice(0, 200) };
      return {
        ok: true as const,
        balance: json?.balance ?? null,
        currency: json?.currency ?? null,
        status: res.status,
      };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  });


// 🤖 Sincronizar IDs da API: lê services do SMMhype, filtra por refill/recarga/reposicion
// para Instagram, TikTok, YouTube e Facebook, e devolve os MAIS BARATOS por rede/tipo.
// Persiste candidatos em services_cache para auditoria futura.
export const sincronizarIdsApi = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const key = process.env.SMMHYPE_API_KEY;
    if (!key) return { ok: false as const, error: "SMMHYPE_API_KEY ausente" };

    const body = new URLSearchParams({ key, action: "services" });
    const res = await fetch("https://smmhype.com/api/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const list = (await res.json()) as Array<{
      service: number | string; name: string; category: string; rate: string | number;
      min?: any; max?: any; refill?: boolean;
    }>;
    if (!Array.isArray(list)) return { ok: false as const, error: "Resposta inválida" };

    const REFILL_RX = /(refill|recarga|reposicion)/i;
    const NETWORKS: Record<string, RegExp> = {
      instagram: /instagram/i,
      tiktok: /tiktok|tik\s*tok/i,
      youtube: /youtube|you\s*tube/i,
      facebook: /facebook/i,
    };
    const TYPES: Record<string, RegExp> = {
      followers: /follower|seguidor|subscriber|inscrit|curtid.*p[áa]gina|page.*like/i,
      likes: /like|curtid/i,
      views: /view|visualiza/i,
    };

    type Pick = { service: number; name: string; category: string; rate: number };
    const cheapest: Record<string, Record<string, Pick | null>> = {};
    for (const net of Object.keys(NETWORKS)) {
      cheapest[net] = { followers: null, likes: null, views: null };
    }

    for (const s of list) {
      const cat = String(s.category ?? "");
      const name = String(s.name ?? "");
      const blob = `${cat} ${name}`;
      const hasRefillFlag = s.refill === true;
      const hasRefillWord = REFILL_RX.test(blob);
      if (!hasRefillFlag && !hasRefillWord) continue;
      const rate = Number(s.rate);
      if (!Number.isFinite(rate) || rate <= 0) continue;
      const sid = Number(s.service);
      if (!Number.isFinite(sid)) continue;

      for (const [net, netRx] of Object.entries(NETWORKS)) {
        if (!netRx.test(blob)) continue;
        // determinar tipo (ordem importa: followers antes de likes p/ "page likes")
        let type: string | null = null;
        if (net === "facebook" && /page.*like|curtid.*p[áa]gina/i.test(blob)) type = "followers";
        else if (TYPES.followers.test(blob)) type = "followers";
        else if (TYPES.views.test(blob)) type = "views";
        else if (TYPES.likes.test(blob)) type = "likes";
        if (!type) continue;
        const cur = cheapest[net][type];
        if (!cur || rate < cur.rate) {
          cheapest[net][type] = { service: sid, name, category: cat, rate };
        }
      }
    }

    // Persiste candidatos descobertos em services_cache (auditoria)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows: any[] = [];
    for (const net of Object.keys(cheapest)) {
      for (const type of Object.keys(cheapest[net])) {
        const p = cheapest[net][type];
        if (!p) continue;
        rows.push({
          provider_service_id: p.service,
          category: p.category,
          name: p.name,
          rate: p.rate,
          refill: true,
          min: 0, max: 0,
          updated_at: new Date().toISOString(),
        });
      }
    }
    // Reset stale candidates: limpa cache antes de gravar os novos vencedores do atacado
    await supabaseAdmin.from("services_cache").delete().gte("provider_service_id", 0);
    if (rows.length > 0) {
      await supabaseAdmin
        .from("services_cache")
        .upsert(rows, { onConflict: "provider_service_id" });
    }

    return {
      ok: true as const,
      synced_at: new Date().toISOString(),
      total_scanned: list.length,
      picks: cheapest,
    };
  });

// 📈 Central de Growth: funil por rede + margem estimada (custo cache vs venda BRL/1000).
// Preço representativo por rede vem do PRICE_TABLE (1k unidades) — fonte estável.
const VENDA_BRL_POR_MIL: Record<string, number> = {
  instagram: 18,   // p1k
  tiktok: 49,      // tf1k
  youtube: 189,    // ys1k
  facebook: 29,    // ff1k
  trafego: 19,     // wbr1k
  telegram: 35,    // tgm1k
};

export const getGrowthCentral = createServerFn({ method: "POST" })
  .inputValidator((i) => adminInput.parse(i))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pedidos } = await supabaseAdmin
      .from("pedidos")
      .select("rede_social, status, valor")
      .order("created_at", { ascending: false })
      .limit(2000);

    type Buck = { paid: number; pending: number; cancelled: number; failed: number; total: number; revenue: number };
    const funil: Record<string, Buck> = {};
    let totalGeral = 0;
    for (const p of pedidos ?? []) {
      const r = ((p as any).rede_social ?? "instagram") as string;
      funil[r] ??= { paid: 0, pending: 0, cancelled: 0, failed: 0, total: 0, revenue: 0 };
      funil[r].total++;
      totalGeral++;
      const s = String((p as any).status);
      if (s === "paid") { funil[r].paid++; funil[r].revenue += Number((p as any).valor) || 0; }
      else if (s === "pending" || s === "mp_pending" || s === "mp_in_process") funil[r].pending++;
      else if (s === "mp_cancelled" || s === "mp_expired") funil[r].cancelled++;
      else if (s === "SMM_FAILED" || s === "amount_mismatch" || s === "mp_rejected") funil[r].failed++;
    }

    const { data: cot } = await supabaseAdmin
      .from("fornecedores").select("cotacao_brl, usd_to_brl").eq("slug", "smmhype").maybeSingle();
    const cotacao = Number((cot as any)?.cotacao_brl ?? (cot as any)?.usd_to_brl) || 7;

    const { data: services } = await supabaseAdmin
      .from("services_cache").select("provider_service_id, name, category, rate");

    const NETS: Record<string, RegExp> = {
      instagram: /instagram/i,
      tiktok: /tiktok|tik\s*tok/i,
      youtube: /youtube|you\s*tube/i,
      facebook: /facebook/i,
    };
    const margem: Record<string, { custo_brl_mil: number | null; venda_brl_mil: number; margem_pct: number | null }> = {};
    for (const net of Object.keys(VENDA_BRL_POR_MIL)) {
      const venda = VENDA_BRL_POR_MIL[net];
      const rx = NETS[net];
      let best: number | null = null;
      if (rx) {
        for (const s of services ?? []) {
          const blob = `${(s as any).category} ${(s as any).name}`;
          if (!rx.test(blob)) continue;
          const rate = Number((s as any).rate);
          if (!Number.isFinite(rate) || rate <= 0) continue;
          if (best == null || rate < best) best = rate;
        }
      }
      const custoBrl = best != null ? +(best * cotacao).toFixed(2) : null;
      const pct = custoBrl != null && venda > 0 ? +(((venda - custoBrl) / venda) * 100).toFixed(1) : null;
      margem[net] = { custo_brl_mil: custoBrl, venda_brl_mil: venda, margem_pct: pct };
    }

    return {
      ok: true as const,
      funil,
      total_pedidos: totalGeral,
      margem,
      cotacao,
    };
  });

// 🤖 Smart Auto-Approve Gate — aprova em massa apenas onde rate recomendado <= rate atual.
// Lê services_cache + override atual; grava overrides; notifica Telegram com resumo.
const PROD_BASELINE: Record<string, Record<string, number | null>> = {
  instagram: { followers: null, likes: 18860, views: 18855 },
  tiktok:    { followers: 14330, likes: 19191, views: 14907 },
  youtube:   { followers: 19440, likes: null,  views: 14321 },
  facebook:  { followers: 18870, likes: 7593,  views: null  },
};

// Venda BRL por 1.000 unidades — usado para checar margem líquida.
const VENDA_BRL_POR_MIL_TIPO: Record<string, Record<string, number>> = {
  instagram: { followers: 18, likes: 12, views: 5 },
  tiktok:    { followers: 49, likes: 15, views: 7 },
  youtube:   { followers: 189, views: 19 },
  facebook:  { followers: 29, likes: 15 },
};
const MARGEM_MINIMA_PCT = 20;

export const smartApproveIds = createServerFn({ method: "POST" })
  .inputValidator((i) => adminInput.parse(i))
  .handler(async ({ data }) => {
    if (!checkToken(data.token)) return { ok: false as const, error: "UNAUTHORIZED" as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Snapshot do cache (todos os candidatos por nome/categoria)
    const { data: cache } = await supabaseAdmin
      .from("services_cache")
      .select("provider_service_id, name, category, rate");
    const cacheRows = (cache ?? []) as Array<{ provider_service_id: number; name: string; category: string; rate: number | string }>;
    const rateById = new Map<number, number>();
    for (const r of cacheRows) {
      const n = Number(r.rate);
      if (Number.isFinite(n)) rateById.set(Number(r.provider_service_id), n);
    }

    // 2) Recomputa MAIS BARATO por rede/tipo (mesma lógica do sincronizarIdsApi)
    const NETWORKS: Record<string, RegExp> = {
      instagram: /instagram/i, tiktok: /tiktok|tik\s*tok/i,
      youtube: /youtube|you\s*tube/i, facebook: /facebook/i,
    };
    const TYPES = {
      followers: /follower|seguidor|subscriber|inscrit|curtid.*p[áa]gina|page.*like/i,
      likes: /like|curtid/i,
      views: /view|visualiza/i,
    };
    const cheapest: Record<string, Record<string, { service: number; rate: number } | null>> = {};
    for (const net of Object.keys(NETWORKS)) cheapest[net] = { followers: null, likes: null, views: null };
    for (const s of cacheRows) {
      const blob = `${s.category ?? ""} ${s.name ?? ""}`;
      const rate = Number(s.rate);
      const sid = Number(s.provider_service_id);
      if (!Number.isFinite(rate) || rate <= 0 || !Number.isFinite(sid)) continue;
      for (const [net, rx] of Object.entries(NETWORKS)) {
        if (!rx.test(blob)) continue;
        let type: string | null = null;
        if (net === "facebook" && /page.*like|curtid.*p[áa]gina/i.test(blob)) type = "followers";
        else if (TYPES.followers.test(blob)) type = "followers";
        else if (TYPES.views.test(blob)) type = "views";
        else if (TYPES.likes.test(blob)) type = "likes";
        if (!type) continue;
        const cur = cheapest[net][type];
        if (!cur || rate < cur.rate) cheapest[net][type] = { service: sid, rate };
      }
    }

    // 3) Override atual (se existir) — define ID/rate vigente em produção
    const { data: existingOverrides } = await supabaseAdmin
      .from("service_id_overrides")
      .select("network, service_type, service_id, rate");
    const overrideMap = new Map<string, { service_id: number; rate: number | null }>();
    for (const o of (existingOverrides ?? []) as any[]) {
      overrideMap.set(`${o.network}/${o.service_type}`, { service_id: Number(o.service_id), rate: o.rate != null ? Number(o.rate) : null });
    }

    // 4) Decide aprovações
    const approvals: Array<{ network: string; type: string; from: number | null; to: number; from_rate: number | null; to_rate: number }> = [];
    const blocked: Array<{ network: string; type: string; reason: string }> = [];
    const skipped: Array<{ network: string; type: string; reason: string }> = [];
    for (const net of Object.keys(cheapest)) {
      for (const type of Object.keys(cheapest[net])) {
        const rec = cheapest[net][type];
        if (!rec) { skipped.push({ network: net, type, reason: "sem candidato" }); continue; }
        const ovr = overrideMap.get(`${net}/${type}`);
        const currentId = ovr?.service_id ?? PROD_BASELINE[net]?.[type] ?? null;
        const currentRate = ovr?.rate ?? (currentId != null ? rateById.get(currentId) ?? null : null);
        if (currentId === rec.service) { skipped.push({ network: net, type, reason: "já está no mais barato" }); continue; }
        if (currentRate == null) {
          blocked.push({ network: net, type, reason: "rate atual desconhecido — requer revisão" });
          continue;
        }
        if (rec.rate > currentRate) {
          blocked.push({ network: net, type, reason: `aumento de custo (${currentRate} → ${rec.rate})` });
          continue;
        }
        approvals.push({ network: net, type, from: currentId, to: rec.service, from_rate: currentRate, to_rate: rec.rate });
      }
    }

    // 4.5) Trava anti-prejuízo: para cada candidato, calcula margem usando cotação BRL e venda alvo.
    //      Se margem líquida < 20%, marca o serviço como bloqueado no banco.
    const { data: cot } = await supabaseAdmin
      .from("fornecedores").select("cotacao_brl, usd_to_brl").eq("slug", "smmhype").maybeSingle();
    const cotacao = Number((cot as any)?.cotacao_brl ?? (cot as any)?.usd_to_brl) || 7;

    const marginBlocks: Array<{ network: string; type: string; margem_pct: number; venda: number; custo_brl: number }> = [];
    for (const net of Object.keys(cheapest)) {
      for (const type of Object.keys(cheapest[net])) {
        const rec = cheapest[net][type];
        if (!rec) continue;
        const venda = VENDA_BRL_POR_MIL_TIPO[net]?.[type];
        if (!venda || venda <= 0) continue;
        const custoBrl = rec.rate * cotacao; // rate = USD por 1000 → BRL por 1000
        const pct = ((venda - custoBrl) / venda) * 100;
        if (pct < MARGEM_MINIMA_PCT) {
          marginBlocks.push({ network: net, type, margem_pct: +pct.toFixed(1), venda, custo_brl: +custoBrl.toFixed(2) });
        }
      }
    }

    // 5) Persiste overrides aprovados (com bloqueio por margem se aplicável)
    if (approvals.length > 0) {
      const blockedSet = new Set(marginBlocks.map((b) => `${b.network}/${b.type}`));
      const rows = approvals.map((a) => {
        const mb = marginBlocks.find((b) => b.network === a.network && b.type === a.type);
        const isBlocked = blockedSet.has(`${a.network}/${a.type}`);
        return {
          network: a.network, service_type: a.type,
          service_id: a.to, rate: a.to_rate,
          previous_service_id: a.from, previous_rate: a.from_rate,
          approved_at: new Date().toISOString(),
          bloqueado: isBlocked,
          bloqueado_motivo: isBlocked && mb
            ? `margem ${mb.margem_pct}% < ${MARGEM_MINIMA_PCT}% (custo R$${mb.custo_brl}/mil vs venda R$${mb.venda})`
            : null,
        };
      });
      const { error: upErr } = await supabaseAdmin
        .from("service_id_overrides")
        .upsert(rows, { onConflict: "network,service_type" });
      if (upErr) return { ok: false as const, error: `DB_UPSERT: ${upErr.message}` };
    }

    // 5.5) Para itens não-aprovados mas com margem ruim, também bloqueia upsertando linha de bloqueio (se já existir override).
    for (const mb of marginBlocks) {
      const wasApproved = approvals.some((a) => a.network === mb.network && a.type === mb.type);
      if (wasApproved) continue;
      const existing = overrideMap.get(`${mb.network}/${mb.type}`);
      if (!existing) continue; // só bloqueia o que já está em produção via override
      await supabaseAdmin
        .from("service_id_overrides")
        .update({
          bloqueado: true,
          bloqueado_motivo: `margem ${mb.margem_pct}% < ${MARGEM_MINIMA_PCT}% (custo R$${mb.custo_brl}/mil vs venda R$${mb.venda})`,
        })
        .eq("network", mb.network).eq("service_type", mb.type);
    }

    // 6) Telegram (best-effort)
    try {
      const tgKey = process.env.TELEGRAM_API_KEY;
      const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
      const lovKey = process.env.LOVABLE_API_KEY;
      if (tgKey && chatId && lovKey && (approvals.length > 0 || marginBlocks.length > 0)) {
        const lines = approvals.map((a) =>
          `• ${a.network}/${a.type}: #${a.from ?? "—"} → #${a.to}  (rate ${a.from_rate} → ${a.to_rate})`
        ).join("\n");
        const mbLines = marginBlocks.map((b) =>
          `⛔ ${b.network}/${b.type}: margem ${b.margem_pct}% < ${MARGEM_MINIMA_PCT}% → BLOQUEADO`
        ).join("\n");
        const text = `🔄 AUDITORIA DE IDs — EliteBoost Prime\n${approvals.length} calibrados · ${marginBlocks.length} bloqueados por margem\n\n${lines}${mbLines ? `\n\n${mbLines}` : ""}${blocked.length ? `\n\n🟡 ${blocked.length} divergências para revisão humana.` : ""}`;
        await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovKey}`,
            "X-Connection-Api-Key": tgKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
        });
      }
    } catch (e) {
      console.warn("[smartApproveIds] telegram falhou:", e);
    }

    return {
      ok: true as const,
      approved: approvals.length,
      blocked: blocked.length,
      skipped: skipped.length,
      approvals,
      blocked_list: blocked,
      margin_blocks: marginBlocks,
    };
  });

// 🔓 Leitura pública: mapa de serviços bloqueados (por network/service_type).
// Bloqueia quando: (a) override marcado como bloqueado, (b) service_id nulo/zero (sem candidato),
// ou (c) nenhum fornecedor ATIVO com saldo > 0 existe (failover esgotado).
export const getBlockedMap = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: forn } = await supabaseAdmin
      .from("fornecedores")
      .select("slug, ativo, saldo_atual")
      .eq("ativo", true);
    const algumDisponivel = (forn ?? []).some((f: any) => Number(f.saldo_atual) > 0);

    const { data, error } = await supabaseAdmin
      .from("service_id_overrides")
      .select("network, service_type, bloqueado, service_id");
    if (error) return { ok: false as const, blocked: [] as Array<{ network: string; service_type: string }> };

    const blocked = (data ?? [])
      .filter((r: any) => !algumDisponivel || r.bloqueado === true || r.service_id == null || Number(r.service_id) === 0)
      .map((r: any) => ({ network: r.network, service_type: r.service_type }));
    return { ok: true as const, blocked };
  });


