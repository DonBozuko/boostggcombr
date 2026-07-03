import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const adminInput = z.object({ token: z.string().min(8) });

export type InsightsPayload = {
  ok: true;
  receita: { dia: number; mes: number; ano: number };
  lucro: { dia: number; mes: number; ano: number };
  ticketMedio: number;
  conversao: number;
  totalPagos: number;
  totalGeral: number;
  topUtm: Array<{ source: string; pagos: number; receita: number }>;
  topHoras: Array<{ hora: number; pagos: number }>;
  topRedes: Array<{ rede: string; pagos: number; receita: number }>;
  recomendacoes: string[];
} | { ok: false; error: string };

export const getInsightsIA = createServerFn({ method: "POST" })
  .inputValidator((input) => adminInput.parse(input))
  .handler(async ({ data }): Promise<InsightsPayload> => {
    if (data.token !== process.env.ADMIN_TOKEN) return { ok: false, error: "UNAUTHORIZED" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const yearAgo = new Date(Date.now() - 365 * 24 * 3600_000).toISOString();
    const { data: rows, error } = await supabaseAdmin
      .from("pedidos")
      .select("status, valor, custo_real, created_at, rede_social, utm_source")
      .gte("created_at", yearAgo)
      .limit(5000);
    if (error) return { ok: false, error: error.message };

    const now = new Date();
    const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startYear = new Date(now.getFullYear(), 0, 1).getTime();

    const acc = {
      receita: { dia: 0, mes: 0, ano: 0 },
      lucro: { dia: 0, mes: 0, ano: 0 },
    };
    const utmAgg = new Map<string, { pagos: number; receita: number }>();
    const horaAgg = new Map<number, number>();
    const redeAgg = new Map<string, { pagos: number; receita: number }>();
    let totalPagos = 0;
    const totalGeral = rows?.length ?? 0;

    for (const r of rows ?? []) {
      const isPaid = r.status === "paid" || r.status === "Enviado" || r.status === "pago" || r.status === "completed";
      if (!isPaid) continue;
      totalPagos++;
      const val = Number(r.valor) || 0;
      const custo = Number(r.custo_real) || 0;
      const lucro = val - custo;
      const t = new Date(r.created_at as string).getTime();
      if (t >= startYear) { acc.receita.ano += val; acc.lucro.ano += lucro; }
      if (t >= startMonth) { acc.receita.mes += val; acc.lucro.mes += lucro; }
      if (t >= startDay) { acc.receita.dia += val; acc.lucro.dia += lucro; }

      const utm = (r.utm_source as string | null) ?? "direct";
      const u = utmAgg.get(utm) ?? { pagos: 0, receita: 0 };
      u.pagos++; u.receita += val; utmAgg.set(utm, u);

      const h = new Date(r.created_at as string).getHours();
      horaAgg.set(h, (horaAgg.get(h) ?? 0) + 1);

      const rede = (r.rede_social as string | null) ?? "indef";
      const re = redeAgg.get(rede) ?? { pagos: 0, receita: 0 };
      re.pagos++; re.receita += val; redeAgg.set(rede, re);
    }

    const ticketMedio = totalPagos > 0 ? acc.receita.ano / totalPagos : 0;
    const conversao = totalGeral > 0 ? (totalPagos / totalGeral) * 100 : 0;
    const topUtm = [...utmAgg.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.receita - a.receita).slice(0, 5);
    const topHoras = [...horaAgg.entries()]
      .map(([hora, pagos]) => ({ hora, pagos }))
      .sort((a, b) => b.pagos - a.pagos).slice(0, 3);
    const topRedes = [...redeAgg.entries()]
      .map(([rede, v]) => ({ rede, ...v }))
      .sort((a, b) => b.receita - a.receita).slice(0, 6);

    const rec: string[] = [];
    if (topUtm[0] && topUtm[0].source !== "direct") {
      rec.push(`Tráfego de "${topUtm[0].source}" lidera com R$ ${topUtm[0].receita.toFixed(2)} — dobre a aposta nesse canal.`);
    } else if (topUtm[0]?.source === "direct") {
      rec.push("Maioria das vendas vem como 'direct' — adicione utm_source nos links de divulgação para medir canais.");
    }
    if (topHoras[0]) {
      rec.push(`Horário de pico: ${topHoras[0].hora}h (${topHoras[0].pagos} pedidos pagos). Concentre campanhas nessa janela.`);
    }
    if (topRedes[0]) {
      rec.push(`Rede campeã: ${topRedes[0].rede} (R$ ${topRedes[0].receita.toFixed(2)}). Priorize estoque/saldo dela.`);
    }
    if (conversao < 10) rec.push(`Conversão Pix em ${conversao.toFixed(1)}% — revise CTA do checkout e provas sociais.`);
    if (acc.lucro.mes < acc.receita.mes * 0.3) rec.push("Margem mensal abaixo de 30% — auditar custo_real dos fornecedores.");

    return {
      ok: true,
      receita: acc.receita,
      lucro: acc.lucro,
      ticketMedio,
      conversao,
      totalPagos,
      totalGeral,
      topUtm,
      topHoras,
      topRedes,
      recomendacoes: rec.slice(0, 5),
    };
  });
