import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ token: z.string().min(8) });

export type WalletRow = {
  wallet_key: string;
  label: string;
  fornecedor_slug: string | null;
  saldo_brl: number;
  reserved_brl: number;
  updated_at: string;
};

export type WalletsSnapshot =
  | { ok: true; wallets: WalletRow[]; queueCount: number; generatedAt: string }
  | { ok: false; error: string };

export const walletsSnapshot = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }): Promise<WalletsSnapshot> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: ws }, { count }] = await Promise.all([
      supabaseAdmin.from("virtual_wallets" as any).select("wallet_key,label,fornecedor_slug,saldo_brl,reserved_brl,updated_at").order("wallet_key"),
      supabaseAdmin.from("pedidos").select("id", { count: "exact", head: true }).eq("status", "waiting_provision"),
    ]);
    return {
      ok: true,
      wallets: ((ws ?? []) as any[]).map((w) => ({
        wallet_key: w.wallet_key, label: w.label, fornecedor_slug: w.fornecedor_slug,
        saldo_brl: Number(w.saldo_brl ?? 0), reserved_brl: Number(w.reserved_brl ?? 0),
        updated_at: w.updated_at,
      })),
      queueCount: Number(count ?? 0),
      generatedAt: new Date().toISOString(),
    };
  });
