// v399 — linhas de auditoria em modo contingência (lê o banco → server-only).
export type AuditRow = {
  serviceId: number;
  name: string;
  category: string | null;
  status: "ATIVO" | "INATIVO" | "REVISAO";
  costUsdPer1k: number;
  costBrlPer1k: number;
  vendaBrlPer1k: number;
  taxaPix: number;
  lucroBrl: number;
  margemPct: number;
};

export const PIX_RATE = 0.0099; // 0,99% MP PIX aprox.

export async function buildContingencyAuditRows(): Promise<AuditRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, provider_service_id, cost_brl, price_brl, source")
    .order("category", { ascending: true })
    .order("quantidade", { ascending: true });

  return ((data ?? []) as any[]).map((r, idx) => {
    const cost = Number(r.cost_brl || 0);
    const price = Number(r.price_brl || 0);
    const pix = price * PIX_RATE;
    const lucro = price - cost - pix;
    return {
      serviceId: Number(r.provider_service_id) || idx + 1,
      name: `${String(r.category ?? "contingencia")} · ${String(r.pacote)} · ${Number(r.quantidade || 0).toLocaleString("pt-BR")}`,
      category: String(r.category ?? "contingencia"),
      status: "ATIVO" as const,
      costUsdPer1k: 0,
      costBrlPer1k: Number(cost.toFixed(2)),
      vendaBrlPer1k: Number(price.toFixed(2)),
      taxaPix: Number(pix.toFixed(2)),
      lucroBrl: Number(lucro.toFixed(2)),
      margemPct: price > 0 ? Number(((lucro / price) * 100).toFixed(1)) : 0,
    };
  });
}
