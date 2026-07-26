import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenOnly = z.object({ token: z.string().min(8), force: z.boolean().optional() });

const upsertInput = z.object({
  token: z.string().min(8),
  pacote: z.string().trim().min(1).max(64),
  category: z.string().trim().min(3).max(64),
  quantidade: z.number().int().positive(),
  cost_brl: z.number().nonnegative().default(0),
  price_brl: z.number().nonnegative().default(0),
  smmhype_service_id: z.string().trim().max(32).nullable().optional(),
  smmpanel_service_id: z.string().trim().max(32).nullable().optional(),
  verified_service_id: z.string().trim().max(32).nullable().optional(),
});

const deleteInput = z.object({ token: z.string().min(8), pacote: z.string().min(1) });

export type PricingCatalogRow = {
  pacote: string;
  category: string;
  quantidade: number;
  cost_brl: number;
  price_brl: number;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
  smmhype_auto_id: string | null;
  smmpanel_auto_id: string | null;
  verified_auto_id: string | null;
  source: string;
  synced_at: string;
};

export type PricingCatalogList =
  | { ok: true; rows: PricingCatalogRow[] }
  | { ok: false; error: string };

export const listPricingCatalog = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.parse(i))
  .handler(async ({ data }): Promise<PricingCatalogList> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { ensureReserveProviderIdsFresh, syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
    // v137 — Strict Cache Purge & Forceful Sync: botão "Atualizar" força motor completo + IDs vivos.
    if (data.force) {
      const { syncPricingCacheAll } = await import("@/lib/pricing-engine.server");
      await syncPricingCacheAll().catch(async (e) => {
        console.warn("[v137] pricing sync falhou; executando handshake de reservas", e);
        await syncReserveProviderIds().catch((err) => console.warn("[v137] force sync falhou", err));
      });
    } else {
      await ensureReserveProviderIdsFresh();
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, category, quantidade, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id, smmhype_auto_id, smmpanel_auto_id, verified_auto_id, source, synced_at")
      .order("category", { ascending: true })
      .order("quantidade", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: (rows ?? []) as any };
  });

const DUP_ID_MSG = "⚠️ Erro Contábil: Os IDs das chaves reservas não podem ser idênticos ao ID da SMMHype. Digite os códigos específicos de cada painel.";

export const upsertPricingCatalog = createServerFn({ method: "POST" })
  .inputValidator((i) => upsertInput.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { respectsMinMargin, computeGuardedPrice } = await import("@/lib/margin-guardian");
    const clean = (v: string | null | undefined) => {
      if (v == null) return null;
      const t = String(v).trim();
      return t === "" ? null : t;
    };
    const hype = clean(data.smmhype_service_id);
    const panel = clean(data.smmpanel_service_id);
    const verified = clean(data.verified_service_id);
    // v135 — Margin Guardian server-side: bloqueia bypass via curl/manipulação externa.
    // Aceita price >= floor da Equação Fabiano OU que respeite 300% de lucro líquido.
    if (data.cost_brl > 0 && data.price_brl > 0) {
      const floor = computeGuardedPrice(data.cost_brl, data.quantidade);
      if (data.price_brl < floor && !respectsMinMargin(data.price_brl, data.cost_brl)) {
        return { ok: false, error: `⛔ v135 Margin Guardian: preço R$${data.price_brl.toFixed(2)} abaixo do piso R$${floor.toFixed(2)} (custo R$${data.cost_brl.toFixed(4)} × 4.0 × 1.15 / 0.9901). Lucro < 300% rejeitado.` };
      }
    }
    // v112/v136 — Lacre Contábil: rejeita duplicação em 0ms antes do INSERT.
    // Isolamento tripartite: hype ≠ panel ≠ verified.
    if (hype && ((panel && panel === hype) || (verified && verified === hype))) {
      return { ok: false, error: DUP_ID_MSG };
    }
    if (panel && verified && panel === verified) {
      return { ok: false, error: "⚠️ v136 Isolamento: SMMPanel e Verified Atacado precisam de IDs nativos distintos — cada API emite seu próprio código." };
    }
    const row = {
      pacote: data.pacote.trim(),
      category: data.category.trim(),
      quantidade: data.quantidade,
      cost_brl: Number(data.cost_brl.toFixed(4)),
      price_brl: Number(data.price_brl.toFixed(2)),
      smmhype_service_id: hype,
      smmpanel_service_id: panel,
      verified_service_id: verified,
      source: "manual",
      synced_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .upsert(row, { onConflict: "pacote" });
    if (error) {
      // Traduz erro do CHECK CONSTRAINT do banco
      if (error.message?.includes("pricing_items_no_duplicate_service_ids")) {
        return { ok: false, error: DUP_ID_MSG };
      }
      return { ok: false, error: error.message };
    }
    return { ok: true };
  });

export const deletePricingCatalog = createServerFn({ method: "POST" })
  .inputValidator((i) => deleteInput.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .delete()
      .eq("pacote", data.pacote);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

// ============================================================
// v275 — Quarentena de mudança de preço em massa.
// Mostra ao dono o que o motor bloqueou e permite liberar de propósito.
// ============================================================
export type QuarantineView =
  | { ok: true; quarantine: null }
  | {
      ok: true;
      quarantine: {
        total: number;
        scanned: number;
        updated_at: string;
        amostra: Array<{ pacote: string; para: number }>;
      };
    }
  | { ok: false; error: string };

export const getPriceQuarantine = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.parse(i))
  .handler(async ({ data }): Promise<QuarantineView> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("admin_settings" as any)
      .select("value")
      .eq("key", "price_quarantine")
      .maybeSingle();
    const v = (row as any)?.value;
    if (!v?.signature || v.applied === true) return { ok: true, quarantine: null };
    return {
      ok: true,
      quarantine: {
        total: Number(v.total ?? 0),
        scanned: Number(v.scanned ?? 0),
        updated_at: String(v.updated_at ?? ""),
        amostra: Array.isArray(v.amostra) ? v.amostra.slice(0, 20) : [],
      },
    };
  });

export const approvePriceQuarantine = createServerFn({ method: "POST" })
  .inputValidator((i) => tokenOnly.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string; applied?: number }> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("admin_settings" as any)
      .select("value")
      .eq("key", "price_quarantine")
      .maybeSingle();
    const v = (row as any)?.value;
    if (!v?.signature) return { ok: false, error: "Nada em quarentena." };
    await supabaseAdmin.from("admin_settings" as any).upsert(
      { key: "price_quarantine", value: { ...v, approved: true } as any },
      { onConflict: "key" },
    );
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "admin@painel",
      action: "preco_massa_aprovado_v275",
      detail: { assinatura: v.signature, total: v.total } as any,
    });
    // Reexecuta a sincronização: com approved=true a mesma leitura é aplicada.
    const { syncReserveProviderIds } = await import("@/lib/pricing-cache.server");
    const rep: any = await syncReserveProviderIds({ bypassLock: true }).catch(() => null);
    return { ok: true, applied: Number(rep?.updated_rows ?? 0) };
  });
