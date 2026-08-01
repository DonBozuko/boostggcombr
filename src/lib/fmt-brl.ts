// v399 — formatação de moeda usada no simulador de compra. Lógica pura.
export function fmtBrl(v: number): string {
  return `R$ ${Number(v).toFixed(2).replace(".", ",")}`;
}
