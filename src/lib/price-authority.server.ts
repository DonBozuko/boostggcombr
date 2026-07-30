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

  for (const c of plan.changes) {
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .update({ price_brl: c.para })
      .eq("pacote", c.pacote);
    if (error) {
      errors += 1;
      console.error("[pricing] v305 autoridade falhou", { pacote: c.pacote, error: error.message });
    } else {
      applied += 1;
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
  // vendendo abaixo da margem. Sai da vitrine com motivo em português.
  for (const b of plan.blocked) {
    // v371 — o motivo é REESCRITO a cada ciclo (antes o `.neq` impedia atualizar
    // pacote já pausado, e o texto ficava eternamente com o motivo antigo
    // "custo disparou 90%"). Só sobrescreve pausa de margem ou pacote ativo —
    // nunca apaga pausa de outro motor (ex.: sem fornecedor na faixa).
    await supabaseAdmin
      .from("pricing_items" as any)
      .update({
        is_sellable: false,
        sellable_reason: `custo do fornecedor subiu: preço justo seria R$ ${b.justo.toFixed(2)} (hoje R$ ${b.atual.toFixed(2)}) — subindo em rampa até fechar a margem`,
      })
      .eq("pacote", b.pacote)
      .or("is_sellable.eq.true,sellable_reason.is.null,sellable_reason.like.custo do fornecedor%");
  }


  // Contrapartida obrigatória: pacote que a AUTORIDADE pausou e que já teve o
  // preço corrigido volta sozinho para a vitrine. Sem isso, a pausa vira lixo
  // permanente e o pacote some do site sem motivo real.
  // v370 — cobre também os pacotes "aposentados" por alta de custo no motor
  // antigo ("custo do fornecedor disparou ..."). Aposentadoria por percentual
  // não existe mais: se a margem fecha no preço vigente, volta a vender.
  const bloqueados = new Set(plan.blocked.map((b) => b.pacote));
  const voltar = plan.rows.filter((r) => !bloqueados.has(r.pacote)).map((r) => r.pacote);
  if (voltar.length > 0) {
    await supabaseAdmin
      .from("pricing_items" as any)
      .update({ is_sellable: true, sellable_reason: null })
      .in("pacote", voltar)
      .like("sellable_reason", "custo do fornecedor%");
  }



  return { checked: plan.checked, applied, errors, changes: plan.changes, blocked: plan.blocked };
}
