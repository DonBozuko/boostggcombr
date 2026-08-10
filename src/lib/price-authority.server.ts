// v305 — Autoridade única de preço aplicada ao banco.
// Único ponto do sistema autorizado a gravar `pricing_items.price_brl`.
// Roda como último passo de todo ciclo de sincronismo, lendo o estado REAL do
// banco depois de os motores gravarem custo e IDs.

import { planAuthorityPrices, type AuthorityChange, type AuthorityBlock } from "./price-authority";

export type AuthorityReport = {
  checked: number;
  applied: number;
  errors: number;
  changes: AuthorityChange[];
  blocked: AuthorityBlock[];
};

export async function enforcePriceAuthority(motivo = "pos-sync"): Promise<AuthorityReport> {
  // v602: Redução de lock side-effect.

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, cost_brl, price_brl");

  const rows = ((data as any[]) ?? []).map((r) => ({
    pacote: String(r.pacote),
    category: String(r.category ?? ""),
    quantidade: Number(r.quantidade ?? 0),
    cost_brl: Number(r.cost_brl ?? 0),
    price_brl: Number(r.price_brl ?? 0),
  }));

  const plan = planAuthorityPrices(rows);
  let applied = 0;
  let errors = 0;

  // v584: Migração para RPC Atômico.
  // Em vez de múltiplas requisições paralelas (v583) que podem estourar o pool de conexões,
  // enviamos todos os updates em um único lote JSON para ser processado no banco.
  if (plan.changes.length > 0) {
    try {
      const updates = plan.changes.map(c => ({
        pacote: c.pacote,
        price: c.para
      }));

      const { data: rpcRes, error: rpcError } = await supabaseAdmin.rpc("bulk_update_pricing", {
        updates
      });

      if (rpcError) throw new Error(rpcError.message);

      const stats = rpcRes as { applied: number; errors: number; failed_items: string[] };
      applied = stats.applied;
      errors = stats.errors;

      if (errors > 0) {
        console.error("[pricing] v584 falhas parciais no RPC", stats.failed_items);
      }
    } catch (err) {
      errors = plan.changes.length;
      console.error("[pricing] v584 falha crítica no RPC atômico", err);
    }
  }

  if (plan.changes.length > 0) {
    console.warn(
      `[pricing] v305 autoridade (${motivo}) ajustou ${applied}/${plan.changes.length}:`,
      plan.changes.slice(0, 10).map((c) => `${c.pacote} R$${c.de}→R$${c.para} (${c.motivo})`).join(", "),
    );
  }
  if (plan.blocked.length > 0) {
    console.warn(
      `[pricing] v305 salto grande NÃO aplicado em ${plan.blocked.length} pacote(s) — decisão do dono`,
    );
  }

  // Salto grande não vira preço novo às cegas — mas também não pode continuar
  // vendendo abaixo da margem. v372: a autoridade de preço NÃO grava mais
  // `is_sellable`. Ela declara o veto dela e a Autoridade de Vitrine decide.
  // Pacote que saiu da lista de bloqueados volta sozinho: o veto some.
  const { syncShelfVetoes } = await import("./shelf-authority.server");
  await syncShelfVetoes(
    "margem",
    plan.blocked.map((b) => ({
      pacote: b.pacote,
      motivo: `custo do fornecedor subiu: preço justo seria R$ ${b.justo.toFixed(2)} (hoje R$ ${b.atual.toFixed(2)}) — subindo em rampa até fechar a margem`,
    })),
  ).catch((e) => console.error("[pricing] v372 veto de margem falhou", e));



  return { checked: plan.checked, applied, errors, changes: plan.changes, blocked: plan.blocked };
}
