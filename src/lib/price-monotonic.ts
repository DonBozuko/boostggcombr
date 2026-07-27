// v292 — Trava de Monotonicidade de Preço (função pura, testável).
//
// CAUSA RAIZ do achado v291 (32 escadas invertidas): o preço é calculado
// item-a-item a partir do custo do fornecedor. Quando o fornecedor tem tarifa
// boa no pacote grande e tarifa ruim no pequeno, a escada inverte (250 por
// R$8,80 e 100 por R$22,28). O cliente compra o maior mais barato — e a
// percepção é de preço quebrado.
//
// Invariante: dentro da MESMA categoria, quantidade maior nunca custa menos
// que a menor. A trava só EMPURRA PRA CIMA (nunca reduz preço), então é
// impossível ela comer margem.

export type LadderRow = {
  pacote: string;
  category: string;
  quantidade: number;
  price_brl: number;
};

export type LadderFix = {
  pacote: string;
  category: string;
  quantidade: number;
  de: number;
  para: number;
};

const ceilTo = (v: number, step: number) => Math.ceil(v / step) * step;

/** Piso do próximo degrau: preço anterior + 3% (mínimo R$ 0,50), arredondado p/ cima em R$ 0,50. */
export function nextStepFloor(prevPrice: number): number {
  const bump = Math.max(0.5, prevPrice * 0.03);
  return Number(ceilTo(prevPrice + bump, 0.5).toFixed(2));
}

/**
 * Aplica a trava sobre uma lista de itens (qualquer ordem, várias categorias).
 * Retorna as correções aplicadas. NÃO muta o array de entrada.
 */
export function enforceMonotonicLadder<T extends LadderRow>(
  rows: T[],
): { rows: T[]; fixes: LadderFix[] } {
  const fixes: LadderFix[] = [];
  const out = rows.map((r) => ({ ...r }));

  const byCategory = new Map<string, T[]>();
  for (const r of out) {
    if (!r.category || !Number.isFinite(Number(r.quantidade))) continue;
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  for (const [category, list] of byCategory) {
    list.sort((a, b) => Number(a.quantidade) - Number(b.quantidade));
    let prev = 0;
    for (const r of list) {
      const price = Number(r.price_brl);
      if (!Number.isFinite(price) || price <= 0) continue;
      if (prev > 0 && price <= prev) {
        const corrigido = nextStepFloor(prev);
        fixes.push({
          pacote: r.pacote,
          category,
          quantidade: Number(r.quantidade),
          de: Number(price.toFixed(2)),
          para: corrigido,
        });
        r.price_brl = corrigido;
        prev = corrigido;
      } else {
        prev = price;
      }
    }
  }

  return { rows: out, fixes };
}
