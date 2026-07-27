// v304 — Invariante de escada aplicada DEPOIS de todo mundo gravar.
//
// CAUSA RAIZ do "conserta e volta": dois motores gravam price_brl no mesmo
// ciclo (pricing-engine, por categoria; pricing-cache/reserve, item-a-item).
// Cada um aplicava a trava de escada no SEU lote — e o lote seguinte
// reintroduzia a inversão. Além disso, o freio de massa (v275) apagava
// justamente as chaves de preço, inclusive as correções de escada.
//
// Aqui a escada vira invariante FINAL: lê o estado real do banco depois de
// todas as gravações e empurra pra cima o que ficou invertido. Só sobe preço
// (nunca reduz), então não existe risco de comer margem.

import { enforceMonotonicLadder, type LadderFix } from "./price-monotonic";

export async function enforceLadderInDb(motivo = "pos-sync"): Promise<{
  checked: number;
  fixes: LadderFix[];
  errors: number;
}> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data } = await supabaseAdmin
    .from("pricing_items" as any)
    .select("pacote, category, quantidade, price_brl");

  const rows = ((data as any[]) ?? [])
    .map((r) => ({
      pacote: String(r.pacote),
      category: String(r.category ?? ""),
      quantidade: Number(r.quantidade ?? 0),
      price_brl: Number(r.price_brl ?? 0),
    }))
    .filter((r) => r.category && r.quantidade > 0 && r.price_brl > 0);

  const { fixes } = enforceMonotonicLadder(rows);
  let errors = 0;

  for (const f of fixes) {
    const { error } = await supabaseAdmin
      .from("pricing_items" as any)
      .update({ price_brl: f.para })
      .eq("pacote", f.pacote);
    if (error) {
      errors += 1;
      console.error("[pricing] v304 escada final falhou", { pacote: f.pacote, error: error.message });
    }
  }

  if (fixes.length > 0) {
    console.warn(
      `[pricing] v304 escada final (${motivo}) corrigiu ${fixes.length} pacote(s):`,
      fixes.slice(0, 10).map((f) => `${f.pacote} R$${f.de}→R$${f.para}`).join(", "),
    );
  }

  return { checked: rows.length, fixes, errors };
}
