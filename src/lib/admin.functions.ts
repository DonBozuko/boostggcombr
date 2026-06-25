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
