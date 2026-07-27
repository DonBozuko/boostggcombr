// v307 — FAXINA. Este arquivo era a SEGUNDA matemática de preço do sistema
// (v173: multiplicador por faixa 5x/8x/12x + piso escalonado + buffer de cupom), rodando no
// navegador com custo chumbado nas landing pages. Ela desenhava um preço
// fantasma antes de o banco responder — origem real do "conserta e volta".
//
// Quem decide preço agora é UM só: src/lib/price-authority.ts (v305/v306).
// Aqui sobrou apenas formatação de moeda, que não é matemática de preço.
// A trava src/__tests__/price-single-math.test.ts impede a volta da fórmula.

export function formatBRL(v: number): string {
  const [int, dec] = Number(v).toFixed(2).split(".");
  const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${withSep},${dec}`;
}
