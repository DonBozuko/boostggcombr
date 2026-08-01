// v399 — agrupamento de ROAS por chave de UTM. Lógica pura.
export type RoasRow = {
  key: string;
  pedidos: number;
  receitaBrl: number;
  ticketMedio: number;
};

export function group(
  rows: Array<{ key: string | null; valor: number | null }>,
  fallback: string,
): RoasRow[] {
  const map = new Map<string, { pedidos: number; receita: number }>();
  for (const r of rows) {
    const k = (r.key ?? fallback) || fallback;
    const v = Number(r.valor ?? 0);
    const cur = map.get(k) ?? { pedidos: 0, receita: 0 };
    cur.pedidos += 1;
    cur.receita += v;
    map.set(k, cur);
  }
  return [...map.entries()]
    .map(([key, v]) => ({
      key,
      pedidos: v.pedidos,
      receitaBrl: Math.round(v.receita * 100) / 100,
      ticketMedio: v.pedidos ? Math.round((v.receita / v.pedidos) * 100) / 100 : 0,
    }))
    .sort((a, b) => b.receitaBrl - a.receitaBrl)
    .slice(0, 30);
}
