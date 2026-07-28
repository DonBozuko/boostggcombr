// v326 — CURVA COERENTE POR CATEGORIA (função pura, testável).
//
// CAUSA RAIZ: a autoridade (v305/v306) congela qualquer preço que já respeite a
// margem real de 4x. Isso protege a margem, mas mantém vivo preço legado
// esquisito. Caso real (instagram:seguidores):
//   500 un → R$ 19,00  (R$ 0,038/un)
//   750 un → R$ 44,50  (R$ 0,059/un)  ← mais caro POR UNIDADE que o de 500
//   5.000  → R$ 130,00 (R$ 0,026/un)
// O cliente compara e conclui que o preço é aleatório.
//
// POR QUE NÃO "preço por unidade sempre decrescente": simulado contra o banco
// real, essa regra derruba a categoria inteira até o pacote-isca mais barato
// (YouTube cairia -76%). Um outlier barato não pode ditar o preço de todos.
//
// REGRA ADOTADA: cada categoria tem um MÚLTIPLO DE VITRINE = mediana de
// (preço atual ÷ preço justo). O preço justo já é uma curva suave (fórmula da
// margem). Quem está muito acima da mediana da própria categoria é outlier e
// desce até a curva; quem está dentro não é tocado.
//
// Travas para não quebrar nada:
//   - só empurra PRA BAIXO (nunca inventa aumento na cara do cliente);
//   - nunca abaixo do preço justo (margem 4x líquida) / piso comercial;
//   - só age acima de 15% de desvio da mediana (filtro de ruído);
//   - queda máxima de 20% por ciclo — converge suave, sem choque na vitrine;
//   - a escada de total (v292) continua sendo a última palavra depois disto.

export type CurveRow = {
  pacote: string;
  category: string;
  quantidade: number;
  price_brl: number;
};

export type CurveFix = {
  pacote: string;
  category: string;
  quantidade: number;
  de: number;
  para: number;
};

/** Queda máxima por ciclo (0.8 = -20%). */
export const CURVE_MAX_DOWN = 0.8;

/** Só corrige quem está MAIS QUE O DOBRO da curva da categoria (outlier claro). */
export const CURVE_TOLERANCE = 2.0;

/** Aterrissagem: o outlier desce até 1,5x a curva — preserva prêmio de vitrine. */
export const CURVE_LANDING = 1.5;

// v327 — TETO DE VITRINE POR CATEGORIA.
//
// CAUSA RAIZ que a v326 não pegava: a regra da mediana só acha OUTLIER DENTRO
// da categoria. Quando a categoria INTEIRA está inflada, a mediana É a inflação
// e nada é corrigido. Medido no banco real: instagram/facebook vivem em ~1,0x
// do preço justo, mas tiktok:seguidores em 3,1x, youtube:inscritos em 4,1x e
// telegram:grupo em 10x — daí "1.000 seguidores TikTok por R$ 278,50" enquanto
// 1.000 do Instagram custa R$ 47,60. Preço que ninguém paga não é margem, é
// prateleira morta (0 vendas acima de 1.000 un em 120 dias).
//
// Invariante nova: nenhum pacote pode ficar acima de CATEGORY_MAX_MULT do seu
// preço justo. O justo já embute margem líquida de 4x + cupom + taxa Pix, então
// o teto NUNCA come a margem mínima. Desce no máximo 20% por ciclo.
export const CATEGORY_MAX_MULT = 1.6;


const r2 = (v: number) => Number(v.toFixed(2));

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * @param fairFor preço justo do pacote (margem 4x + piso comercial).
 *                Devolver 0 quando o custo é desconhecido — o pacote é ignorado.
 */
export function enforceCategoryCurve<T extends CurveRow>(
  rows: T[],
  fairFor: (row: T) => number,
): { rows: T[]; fixes: CurveFix[] } {
  const fixes: CurveFix[] = [];
  const out = rows.map((r) => ({ ...r }));

  const byCategory = new Map<string, T[]>();
  for (const r of out) {
    if (!r.category) continue;
    if (!(Number(r.quantidade) > 0) || !(Number(r.price_brl) > 0)) continue;
    if (!(Number(fairFor(r)) > 0)) continue;
    const list = byCategory.get(r.category) ?? [];
    list.push(r);
    byCategory.set(r.category, list);
  }

  for (const [category, list] of byCategory) {
    // v327 — teto absoluto: vale mesmo em categoria pequena (não depende de mediana).
    for (const r of list) {
      const justo = Number(fairFor(r));
      const price = Number(r.price_brl);
      const teto = justo * CATEGORY_MAX_MULT;
      if (price <= teto + 0.009) continue;
      const alvo = r2(Math.max(teto, justo, price * CURVE_MAX_DOWN));
      if (alvo < price - 0.009) {
        fixes.push({ pacote: r.pacote, category, quantidade: Number(r.quantidade), de: r2(price), para: alvo });
        r.price_brl = alvo;
      }
    }

    // Categoria pequena não tem mediana confiável: não mexe.
    if (list.length < 4) continue;

    const mult = median(list.map((r) => Number(r.price_brl) / Number(fairFor(r))));
    if (!(mult > 0)) continue;

    for (const r of list) {
      const justo = Number(fairFor(r));
      const price = Number(r.price_brl);
      const naCurva = justo * mult;
      if (price <= naCurva * CURVE_TOLERANCE + 0.009) continue;

      const alvo = r2(Math.max(naCurva * CURVE_LANDING, justo, price * CURVE_MAX_DOWN));
      if (alvo < price - 0.009) {
        const antes = fixes.findIndex((f) => f.pacote === r.pacote);
        if (antes >= 0) fixes[antes].para = alvo;
        else fixes.push({ pacote: r.pacote, category, quantidade: Number(r.quantidade), de: r2(price), para: alvo });
        r.price_brl = alvo;
      }
    }
  }


  return { rows: out, fixes };
}
