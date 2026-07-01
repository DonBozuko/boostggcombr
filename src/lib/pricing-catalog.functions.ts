import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenOnly = z.object({ token: z.string().min(8) });

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("pricing_items" as any)
      .select("pacote, category, quantidade, cost_brl, price_brl, smmhype_service_id, smmpanel_service_id, verified_service_id, source, synced_at")
      .order("category", { ascending: true })
      .order("quantidade", { ascending: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, rows: (rows ?? []) as any };
  });

export const upsertPricingCatalog = createServerFn({ method: "POST" })
  .inputValidator((i) => upsertInput.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clean = (v: string | null | undefined) => {
      if (v == null) return null;
      const t = String(v).trim();
      return t === "" ? null : t;
    };
    const row = {
      pacote: data.pacote.trim(),
      category: data.category.trim(),
      quantidade: data.quantidade,
      cost_brl: Number(data.cost_brl.toFixed(4)),
      price_brl: Number(data.price_brl.toFixed(2)),
      smmhype_service_id: clean(data.smmhype_service_id),
      smmpanel_service_id: clean(data.smmpanel_service_id),
      verified_service_id: clean(data.verified_service_id),
      source: "manual",
      synced_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .upsert(row, { onConflict: "pacote" });
    if (error) return { ok: false, error: error.message };
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
