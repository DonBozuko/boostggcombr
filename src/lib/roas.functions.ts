import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RoasRow = {
  key: string;
  pedidos: number;
  receitaBrl: number;
  ticketMedio: number;
};

export type RoasReport = {
  ok: true;
  janelaDias: number;
  totalPedidos: number;
  totalReceitaBrl: number;
  porCriativo: RoasRow[];   // utm_content
  porCampanha: RoasRow[];   // utm_campaign
  porFonte: RoasRow[];      // utm_source
};

const inputSchema = z.object({
  adminToken: z.string().min(1),
  janelaDias: z.number().int().min(1).max(90).default(30),
});

function group(
  rows: Array<{ key: string | null; valor: number | null }>,
  fallback: string,
): RoasRow[] {
  const map = new Map<string, { pedidos: number; receita: number }>();
  for (const r of rows) {
    const k = (r.key ?? fallback) || fallback;
    const v = Number(r.valor ?? 0);
    const cur = map.get(k) ?? { pedidos: 0, receita: 0 };
    cur.pedidos += 1;
    cur.receita += v;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      pedidos: v.pedidos,
      receitaBrl: Math.round(v.receita * 100) / 100,
      ticketMedio: v.pedidos ? Math.round((v.receita / v.pedidos) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.receitaBrl - a.receitaBrl)
    .slice(0, 30);
}

export const getRoasReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    if (data.adminToken !== process.env.ADMIN_TOKEN) {
      return { ok: false as const, error: "UNAUTHORIZED" as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.janelaDias * 86400_000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("valor, utm_source, utm_medium, utm_campaign, utm_content")
      .in("status", ["approved", "processing", "completed", "delivered", "dispatched"])
      .gte("created_at", since);

    if (error) {
      console.error("[ROAS] query failed:", error);
      return { ok: false as const, error: "DB_FAILED" as const };
    }

    type Row = { valor: number | null; utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null };
    const list = (rows ?? []) as Row[];

    const totalPedidos = list.length;
    const totalReceitaBrl = Math.round(list.reduce((s, r) => s + Number(r.valor ?? 0), 0) * 100) / 100;

    const report: RoasReport = {
      ok: true,
      janelaDias: data.janelaDias,
      totalPedidos,
      totalReceitaBrl,
      porCriativo: group(list.map((r) => ({ key: r.utm_content, valor: r.valor })), "(sem utm_content)"),
      porCampanha: group(list.map((r) => ({ key: r.utm_campaign, valor: r.valor })), "(sem utm_campaign)"),
      porFonte: group(list.map((r) => ({ key: r.utm_source, valor: r.valor })), "direct"),
    };

    return report;
  });
