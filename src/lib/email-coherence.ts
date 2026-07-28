// v333 — COERÊNCIA DOS E-MAILS TRANSACIONAIS
//
// Por que existe: o e-mail é a única superfície que chega sozinha na caixa do
// cliente. Estava declarada SEM detector no mapa de cobertura (v332). Dois
// riscos reais: (1) prometer BR/reposição que o catálogo não tem — mesma
// mentira da v331, só que por escrito e arquivada; (2) sair com lacuna não
// preenchida ({{nome}}, undefined, null) e queimar a marca.
//
// Módulo puro: recebe o código-fonte do template e os fatos do catálogo.

import { CLAIM_BR_RE, CLAIM_REFILL_RE, type PromiseFacts } from "@/lib/promise-coherence";
import { extrairTextoVisivel } from "@/lib/surface-text";

export type EmailViolation = {
  template: string;
  kind: "promete_demais" | "lacuna_nao_preenchida";
  trecho: string;
};

/** Lacuna de template que vazaria literalmente para o cliente. */
const LACUNA_RE = /\{\{\s*[\w.]+\s*\}\}|\b(?:undefined|null|NaN)\b|\[\s*inserir[^\]]*\]/i;

export function checkEmailCoherence(input: {
  template: string;
  source: string;
  facts: PromiseFacts;
}): EmailViolation[] {
  const { template, source, facts } = input;
  const out: EmailViolation[] = [];

  for (const texto of extrairTextoVisivel(source)) {
    if (!facts.hasBr && CLAIM_BR_RE.test(texto)) {
      out.push({ template, kind: "promete_demais", trecho: texto });
    }
    if (!facts.hasRefill && CLAIM_REFILL_RE.test(texto)) {
      out.push({ template, kind: "promete_demais", trecho: texto });
    }
  }

  // Lacuna precisa ser vista no código cru: o extrator de texto remove
  // chaves, e era justamente dentro delas que a lacuna se escondia.
  for (const linha of String(source).split(/\n/)) {
    const m = linha.match(LACUNA_RE);
    if (m) {
      out.push({ template, kind: "lacuna_nao_preenchida", trecho: linha.trim().slice(0, 160) });
    }
  }

  return out;
}
