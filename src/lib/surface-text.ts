// v332 — VARREDURA DE SUPERFÍCIE
//
// Por que existe: a v331 só olhava FAQ e depoimentos. O texto que mais vende
// (corpo das landings SEO, blog, headline, bullets) não tinha detector nenhum.
// "Não medido" virava "sinal verde". Aqui o texto visível de QUALQUER rota
// pública é extraído do próprio código-fonte e passa pelo mesmo juiz de
// promessa × catálogo.

/** Rotas que não são vitrine (não têm promessa comercial ao cliente). */
const IGNORAR_RE =
  /^(admin|api|email|lovable|painel-|dashboard|mcp|sitemap|unsubscribe|~|\.)/i;

/** Rede a partir do caminho do arquivo de rota. */
export function redeDaRota(path: string): string | null {
  const nome = String(path).split("/").pop()?.replace(/\.tsx?$/, "") ?? "";
  if (!nome || IGNORAR_RE.test(nome)) return null;
  const p = nome.toLowerCase();
  if (/tiktok/.test(p)) return "tiktok";
  if (/youtube|inscritos/.test(p)) return "youtube";
  if (/kwai/.test(p)) return "kwai";
  if (/facebook/.test(p)) return "facebook";
  if (/telegram/.test(p)) return "telegram";
  if (/trafego/.test(p)) return "trafego";
  if (/instagram|seguidores|curtidas|engajamento|impulsionar|audiencia|index|blog/.test(p))
    return "instagram";
  return null;
}

/**
 * Extrai o texto que o cliente lê, a partir do código-fonte da rota.
 * Regras: fora imports, comentários, atributos técnicos (className, href,
 * import, chaves de objeto) e código. Sobram literais de texto e texto JSX.
 */
export function extrairTextoVisivel(source: string): string[] {
  let s = String(source ?? "");
  s = s.replace(/^import[\s\S]*?from\s+["'][^"']+["'];?/gm, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  // atributos técnicos não são texto de venda
  s = s.replace(/\b(className|class|href|to|src|id|key|name|property|rel|type)=\{?["'][^"']*["']\}?/g, " ");

  const out: string[] = [];
  const push = (t: string) => {
    const limpo = t
      .replace(/\{[^{}]*\}/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (limpo.length >= 12 && /[a-zà-ú]{4}/i.test(limpo)) out.push(limpo);
  };

  // texto entre tags JSX
  for (const m of s.matchAll(/>([^<>{}]{12,})</g)) push(m[1]);
  // literais de string longos (títulos, descrições, arrays de bullets)
  for (const m of s.matchAll(/["'`]([^"'`\n]{12,})["'`]/g)) push(m[1]);

  return Array.from(new Set(out));
}
