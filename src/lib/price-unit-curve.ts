// v326 — COERÊNCIA DA CURVA DE DESCONTO POR VOLUME (função pura, testável).
//
// CAUSA RAIZ: a autoridade (v305/v306) congela qualquer preço que já respeite
// a margem real de 4x. Isso protege a margem, mas deixa preço legado esquisito
// vivo para sempre. Resultado real no banco (instagram:seguidores):
//   500 un → R$ 19,00  (R$ 0,038/un)
//   750 un → R$ 44,50  (R$ 0,059/un)   ← mais caro POR UNIDADE que o de 500
//   5.000  → R$ 130,00 (R$ 0,026/un)
// O cliente compara e conclui que o preço é aleatório. Não é margem: é lixo
// histórico congelado.
//
// Invariante nova: dentro da MESMA categoria, o preço POR UNIDADE nunca sobe
// quando a quantidade sobe (desconto por volume sempre faz sentido).
//
// Travas obrigatórias para não quebrar nada:
//   - a correção só EMPURRA PRA BAIXO (nunca inventa aumento na cara do cliente);
//   - nunca abaixo do preço justo (margem 4x líquida) nem do piso comercial;
//   - queda máxima de 20% por ciclo — converge em poucos ciclos, sem choque;
//   - a escada de total (v292) continua sendo a última palavra depois disto.

export type UnitRow = {
  pacote: string;
  category: string;
  quantidade: number;
  price_brl: number;
};

export type UnitFix = {
  pacote: string;
  category: string;
  quantidade: number;
  de: number;
  para: number;
};

/** Queda máxima por ciclo (0.8 = -20%). */
export const UNIT_MAX_DOWN = 0.8;

/** Filtro de ruído: só corrige quando a incoerência passa de 5% (v311). */
export const UNIT_TOLERANCE = 1.05;

const r2 = (v: number) => Number(v.toFixed(2));

/**
 * @param floorFor piso absoluto do pacote (preço justo / piso comercial).
 *                 Se devolver 0, o pacote não é corrigido (custo desconhecido).
 */
export function enforceUnitCoherence<T extends UnitRow>(
  rows: T[],
  floorFor: (row: T) => number,
): { rows: T[]; fixes: UnitFix[] } {
  const fixes: UnitFix[] = [];
  const out = rows.map((r) => ({ ...r }));

  const byCategory = new Map<string, T[]>();
  for (const r of out) {
    const qty = Number(r.quantidade);
    if (!r.category || !Number.isFinite(qty) || qty <= 0) continue;
    if (!(Number(r.price_brl) > 0)) continue;
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  for (const [category, list] of byCategory) {
    list.sort((a, b) => Number(a.quantidade) - Number(b.quantidade));
    let cap = Number.POSITIVE_INFINITY; // maior R$/unidade permitido daqui pra frente

    for (const r of list) {
      const qty = Number(r.quantidade);
      const price = Number(r.price_brl);
      const unit = price / qty;

      if (unit > cap * UNIT_TOLERANCE + 1e-9) {
        const piso = Number(floorFor(r)) || 0;
        if (piso > 0) {
          const alvo = r2(Math.max(cap * qty, piso, price * UNIT_MAX_DOWN));
          if (alvo < price - 0.009) {
            fixes.push({ pacote: r.pacote, category, quantidade: qty, de: r2(price), para: alvo });
            r.price_brl = alvo;
          }
        }
      }

      cap = Math.min(cap, Number(r.price_brl) / qty);
    }
  }

  return { rows: out, fixes };
}
