// v399 — leitura do número de inscritos a partir do HTML público do YouTube.
// Lógica pura (string in / número out) — vive fora do arquivo de server functions
// para não correr risco de ser apagada pelo divisor de bundle.

/**
 * Acha a contagem DO CANAL PEDIDO no HTML público.
 *
 * Cuidado que custou caro: a página traz a contagem de vários canais
 * (sugestões da lateral). Pegar "o primeiro número que aparece" devolvia o
 * canal errado — número real, canal errado, ou seja: mentira. Por isso a busca
 * é ancorada no @ do canal e, se não achar, no cabeçalho da página. Se nenhuma
 * âncora bater, devolvemos null em vez de chutar.
 */
const RE_CONTAGEM =
  /"(?:content|simpleText|label)":"([\d.,]+\s*(?:mil|mi|milh(?:ão|ões)|k|m|b)?\s*(?:de\s*)?(?:inscritos|subscribers)[^"]*)"/i;

export function extrairInscritosTexto(html: string, handle?: string): string | null {
  const low = html.toLowerCase();

  if (handle) {
    const i = low.indexOf(`"content":"@${handle.toLowerCase()}"`);
    if (i >= 0) {
      const m = html.slice(i, i + 800).match(RE_CONTAGEM)?.[1];
      if (m) return m.trim();
    }
  }

  const j = low.indexOf('"pageheaderrenderer"');
  if (j >= 0) {
    const m = html.slice(j, j + 8000).match(RE_CONTAGEM)?.[1];
    if (m) return m.trim();
  }

  const legado = html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)?.[1];
  return legado ? legado.trim() : null;
}

/** "30,1 mi" / "1,38 mi" / "980 mil" → número aproximado. */
export function parseInscritos(txt: string): number | null {
  // "mil" antes de "mi": senão "980 mil" seria lido como 980 milhões.
  const m = txt.match(/([\d.,]+)\s*(mil|mi|k|m|b)?/i);
  if (!m) return null;
  const base = Number(m[1]!.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(base)) return null;
  const suf = (m[2] ?? "").toLowerCase();
  if (suf === "b") return Math.round(base * 1_000_000_000);
  if (suf === "mi" || suf === "m") return Math.round(base * 1_000_000);
  if (suf === "mil" || suf === "k") return Math.round(base * 1_000);
  return Math.round(base);
}
