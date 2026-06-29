import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ token: z.string().min(8) });

export type TreasurySnapshot =
  | { ok: true;
      diario: { fat: number; lucro: number; pix: number; custo: number };
      semanal: { fat: number; lucro: number };
      mensal: { fat: number; lucro: number };
      previsao30d: number;
      ultimas: Array<{ occurred_at: string; faturamento: number; lucro_liquido: number; network: string | null }>;
    }
  | { ok: false; error: string };

export const treasurySnapshot = createServerFn({ method: "POST" })
  .inputValidator((i) => input.parse(i))
  .handler(async ({ data }): Promise<TreasurySnapshot> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const d7 = new Date(Date.now() - 7 * 86400_000).toISOString();
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString();

    const [{ data: hoje }, { data: w7 }, { data: w30 }, { data: ult }] = await Promise.all([
      supabaseAdmin.from("admin_treasury" as any).select("faturamento, lucro_liquido, taxa_pix, custo_api").gte("occurred_at", d0),
      supabaseAdmin.from("admin_treasury" as any).select("faturamento, lucro_liquido").gte("occurred_at", d7),
      supabaseAdmin.from("admin_treasury" as any).select("faturamento, lucro_liquido").gte("occurred_at", d30),
      supabaseAdmin.from("admin_treasury" as any).select("occurred_at, faturamento, lucro_liquido, network").order("occurred_at", { ascending: false }).limit(10),
    ]);
    const sum = (rs: any[] | null, k: string) => (rs ?? []).reduce((s, r) => s + Number(r[k] || 0), 0);
    const lucro7d = sum(w7 as any, "lucro_liquido");
    return {
      ok: true,
      diario: {
        fat: sum(hoje as any, "faturamento"),
        lucro: sum(hoje as any, "lucro_liquido"),
        pix: sum(hoje as any, "taxa_pix"),
        custo: sum(hoje as any, "custo_api"),
      },
      semanal: { fat: sum(w7 as any, "faturamento"), lucro: lucro7d },
      mensal: { fat: sum(w30 as any, "faturamento"), lucro: sum(w30 as any, "lucro_liquido") },
      previsao30d: lucro7d > 0 ? Number(((lucro7d / 7) * 30).toFixed(2)) : 0,
      ultimas: ((ult ?? []) as any).map((r: any) => ({
        occurred_at: r.occurred_at, faturamento: Number(r.faturamento), lucro_liquido: Number(r.lucro_liquido), network: r.network,
      })),
    };
  });
