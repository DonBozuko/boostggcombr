// v298 — Botão de recarga direto no alerta de saldo.
//
// Por que existe: quando o saldo de um fornecedor cai, o alerta no Telegram
// dizia "recarregue agora" mas obrigava a abrir o painel na mão. Com 4
// fornecedores ativos, isso custa minutos justamente no momento em que
// segundos importam. Aqui derivamos o link de recarga do PRÓPRIO api_url
// cadastrado no banco — nada hardcoded, então um 5º fornecedor já nasce
// com botão funcionando.
//
// Puro de propósito (sem banco/HTTP) para ser testável.

export type TopupProvider = {
  nome: string;
  slug?: string | null;
  api_url?: string | null;
  saldoBrl?: number | null;
};

/** Painéis SMM (script padrão) expõem a recarga em /addfunds. */
export function buildTopupUrl(apiUrl: string | null | undefined): string | null {
  const raw = String(apiUrl ?? "").trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return `${u.origin}/addfunds`;
  } catch {
    return null;
  }
}

export type TopupButton = { text: string; url: string };

/**
 * Uma linha por fornecedor: com 4 painéis, um teclado de 4 linhas é o que
 * evita clique errado no celular. Fornecedor sem api_url válido é omitido
 * (botão quebrado é pior que botão ausente).
 */
export function buildTopupKeyboard(providers: TopupProvider[]): TopupButton[][] {
  const rows: TopupButton[][] = [];
  for (const p of providers) {
    const url = buildTopupUrl(p.api_url);
    if (!url) continue;
    const saldo = Number(p.saldoBrl);
    const label = Number.isFinite(saldo)
      ? `💳 Recarregar ${p.nome} (R$ ${saldo.toFixed(2)})`
      : `💳 Recarregar ${p.nome}`;
    rows.push([{ text: label, url }]);
  }
  return rows;
}
