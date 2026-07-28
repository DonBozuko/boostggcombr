// v339 — LANÇAMENTO ÚNICO NO CAIXA
//
// Causa raiz de "venda concluída sem lançamento no caixa": o registro em
// admin_treasury era feito APENAS dentro de um dos caminhos de despacho
// (fallback direto do webhook). Pedido entregue por outro caminho (fila,
// reprocessamento, contingência) ficava fora do caixa — dinheiro real que não
// aparecia no relatório.
//
// Em vez de espalhar a gravação por todos os caminhos (o que volta a quebrar no
// próximo caminho novo), existe UM ponto que garante o lançamento: esta função
// roda junto da reconciliação e fecha qualquer buraco, venha de onde vier.
//
// Regras:
// - Só pedido com dinheiro de verdade (pago/entregue), nunca reembolsado.
// - Idempotente: upsert por pedido_id, nunca duplica.
// - Mesma matemática do webhook (taxa Pix MP 0,99% + R$0,49).

const TAXA_PIX_PCT = 0.0099;
const TAXA_PIX_FIXA = 0.49;

const STATUS_COM_DINHEIRO = ["paid", "waiting_provision", "Enviado", "processing", "completed"];

export type TreasuryBackfillResult = {
  verificados: number;
  lancados: number;
  pedidos: string[];
  erro?: string;
};

export async function backfillTreasury(days = 30): Promise<TreasuryBackfillResult> {
  const out: TreasuryBackfillResult = { verificados: 0, lancados: 0, pedidos: [] };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    const { data: pedidos } = await supabaseAdmin
      .from("pedidos")
      .select("id, valor, custo_real, pacote, provider_slug, status, created_at")
      .in("status", STATUS_COM_DINHEIRO)
      .gte("created_at", since);

    const lista = (pedidos as any[]) ?? [];
    out.verificados = lista.length;
    if (lista.length === 0) return out;

    const { data: jaTem } = await supabaseAdmin
      .from("admin_treasury" as any)
      .select("pedido_id")
      .in("pedido_id", lista.map((p) => p.id));

    const comCaixa = new Set(((jaTem as any[]) ?? []).map((r) => r.pedido_id));

    for (const p of lista) {
      if (comCaixa.has(p.id)) continue;
      const fat = Number(p.valor) || 0;
      if (fat <= 0) continue;
      const custo = Number(p.custo_real) || 0;
      const taxaPix = Number((fat * TAXA_PIX_PCT + TAXA_PIX_FIXA).toFixed(2));
      const lucroLiq = Number((fat - custo - taxaPix).toFixed(2));
      const netPct = fat > 0 ? Number(((lucroLiq / fat) * 100).toFixed(2)) : 0;

      // insert simples: a ausência já foi checada acima e o banco tem índice
      // único em pedido_id, então corrida dupla é barrada pelo próprio banco.
      const { error } = await supabaseAdmin.from("admin_treasury" as any).insert({
        pedido_id: p.id,
        faturamento: fat,
        custo_api: Number(custo.toFixed(2)),
        taxa_pix: taxaPix,
        lucro_liquido: lucroLiq,
        network: String(p.pacote ?? "").split("_")[0] || null,
        occurred_at: p.created_at ?? new Date().toISOString(),
        supplier_cost: custo > 0 ? Number(custo.toFixed(4)) : null,
        provider_selected: p.provider_slug ?? null,
        net_profit_percentage: netPct,
      } as any);
      if (!error) {
        out.lancados += 1;
        out.pedidos.push(p.id);
      } else {
        out.erro = error.message;
      }
    }

  } catch (e: any) {
    out.erro = String(e?.message ?? e);
  }
  return out;
}
