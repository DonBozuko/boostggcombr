// v333 — COERÊNCIA VISUAL (imagens e provas das landings)
//
// Por que existe: o mapa de cobertura (v332) declarava "imagens e provas
// visuais" como família SEM detector. Imagem é prova de venda: se o arquivo
// não existe, o cliente vê caixa quebrada; se o texto alternativo promete
// "seguidores brasileiros" numa rede 100% global, é a mesma mentira da v331 —
// só que escondida num atributo que ninguém lê.
//
// Módulo puro: recebe o código-fonte e a lista de arquivos existentes.

import { CLAIM_BR_RE, CLAIM_REFILL_RE, type PromiseFacts } from "@/lib/promise-coherence";

export type VisualViolation = {
  origem: string;
  kind: "arquivo_ausente" | "sem_alt" | "alt_promete_demais";
  detalhe: string;
};

type Img = { src: string | null; alt: string | null; bruto: string };

/** Extrai as tags <img>/<Img> com src e alt do código-fonte. */
export function extrairImagens(source: string): Img[] {
  const out: Img[] = [];
  for (const m of String(source ?? "").matchAll(/<(?:img|Img)\b([^>]*?)\/?>/gs)) {
    const attrs = m[1] ?? "";
    const src = attrs.match(/\bsrc=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/);
    const alt = attrs.match(/\balt=(?:"([^"]*)"|'([^']*)'|\{`?([^}`]*)`?\})/);
    out.push({
      src: src ? (src[1] ?? src[2] ?? src[3] ?? "").trim() : null,
      alt: alt ? (alt[1] ?? alt[2] ?? alt[3] ?? "").trim() : null,
      bruto: m[0].slice(0, 160),
    });
  }
  return out;
}

/** Caminhos locais servidos por /public que o código referencia diretamente. */
export function referenciasPublicas(source: string): string[] {
  const out = new Set<string>();
  for (const m of String(source ?? "").matchAll(/["'`](\/[a-z0-9][^"'`\s]*\.(?:png|jpe?g|webp|svg|gif|mp4|webm|mp3|wav|ogg))["'`]/gi)) {
    out.add(m[1]);
  }
  return Array.from(out);
}

/**
 * Confere as provas visuais de UMA página.
 * - arquivo local referenciado que não existe → imagem quebrada na cara do cliente
 * - imagem sem texto alternativo → prova invisível para leitor de tela e Google
 * - texto alternativo prometendo BR/reposição que a rede não tem → v331 escondida
 */
export function checkVisualCoherence(input: {
  origem: string;
  source: string;
  facts?: PromiseFacts;
  arquivosExistentes: Set<string>;
}): VisualViolation[] {
  const out: VisualViolation[] = [];
  const { origem, source, facts, arquivosExistentes } = input;

  for (const ref of referenciasPublicas(source)) {
    if (!arquivosExistentes.has(ref)) {
      out.push({
        origem,
        kind: "arquivo_ausente",
        detalhe: `A página aponta para o arquivo ${ref}, que não existe no site.`,
      });
    }
  }

  for (const img of extrairImagens(source)) {
    const alt = img.alt ?? "";
    // alt="" é decoração declarada de propósito — não é falha.
    if (img.alt === null) {
      out.push({
        origem,
        kind: "sem_alt",
        detalhe: `Imagem sem descrição: ${img.bruto}`,
      });
      continue;
    }
    if (!alt) continue;
    if (facts && !facts.hasBr && CLAIM_BR_RE.test(alt)) {
      out.push({
        origem,
        kind: "alt_promete_demais",
        detalhe: `Descrição de imagem promete público brasileiro: "${alt}"`,
      });
    }
    if (facts && !facts.hasRefill && CLAIM_REFILL_RE.test(alt)) {
      out.push({
        origem,
        kind: "alt_promete_demais",
        detalhe: `Descrição de imagem promete reposição: "${alt}"`,
      });
    }
  }

  return out;
}
