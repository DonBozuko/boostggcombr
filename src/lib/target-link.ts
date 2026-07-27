// v303 — PONTO ÚNICO DE VERDADE DO LINK ENVIADO AO FORNECEDOR.
//
// Por que existe: a limpeza de link estava duplicada em dois arquivos
// (`smmhype.server.ts` e `dispatcher-fallback.server.ts`) com listas de
// rastreadores DIFERENTES. Resultado real: o SMMhype não removia `?si=` e
// `?feature=` (os rastreadores que o YouTube cola no botão Compartilhar),
// então o mesmo pedido era aceito por um fornecedor e recusado por outro com
// "Unable to verify your domain submission" — falha silenciosa que só aparece
// como estorno.
//
// Puro de propósito: sem rede, sem banco, testável.

/** Rastreadores que fazem painéis SMM recusarem o alvo. */
const TRACKER_PARAM =
  /^(igsh|igshid|utm_[a-z_]+|is_from_webapp|sender_device|si|feature|fbclid|gclid|mibextid|_r|_t|_u|app|pp|lang)$/i;

export function stripTrackers(url: string): string {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) {
      if (TRACKER_PARAM.test(k)) u.searchParams.delete(k);
    }
    u.hash = "";
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

/** Perfil de Instagram canônico, aceito por todos os 4 fornecedores. */
export function normalizeInstagramUser(raw: string): string {
  const handle = String(raw ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/^(m\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/[/?#].*$/, "")
    .trim();
  if (!handle) return String(raw ?? "").trim();
  return `https://instagram.com/${handle}`;
}
