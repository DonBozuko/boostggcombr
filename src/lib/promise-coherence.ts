// v331 — COERÊNCIA ENTRE PROMESSA E CATÁLOGO
//
// Por que existe: até agora todo "sinal verde" media o que o SISTEMA faz
// (preço, rota, saldo, entrega). Nenhuma trava media o que o SITE PROMETE.
// Por isso as auditorias manuais de /kwai, /facebook, /telegram e /trafego
// acharam texto vendendo "perfis brasileiros" e "reposição garantida" em
// redes cujo catálogo é 100% global e sem refill: era uma família de falha
// SEM detector. Aqui ela ganha detector permanente.
//
// Regra: o texto público (FAQ, depoimento, meta) só pode prometer o que
// existe no catálogo daquela rede AGORA. Catálogo é a verdade; copy é
// derivada. Se o fornecedor tirar a linha BR amanhã, este detector acusa.

/** Promessa de origem brasileira (perfis reais do Brasil). */
export const CLAIM_BR_RE =
  /brasileiro\s*real|perfis?\s+brasileir|seguidores?\s+brasileir|membros?\s+brasileir|curtidas?\s+brasileir|linha\s+br\b|pacotes?\s+brasileir|audi[êe]ncia\s+brasileira/i;

/** Promessa de reposição/garantia contra queda. */
export const CLAIM_REFILL_RE =
  /reposi[çc][ãa]o\s+(garantida|por\s+\d+|de\s+\d+|nos?\s+)|garantia\s+de\s+reposi[çc][ãa]o|refill\s+garantid|sem\s+drop|sem\s+queda|n[ãa]o\s+cai(?:em)?\b/i;

/** Negativas explícitas ("hoje não", "não há reposição garantida") não são promessa. */
const NEGATION_RE =
  /\b(n[ãa]o|sem\s+garantia|hoje\s+n[ãa]o|nenhum|inexistente)\b[^.]{0,60}$/i;

export type PromiseFacts = {
  /** Rede tem ao menos um pacote vendável de origem brasileira. */
  hasBr: boolean;
  /** Rede tem ao menos um pacote vendável com refill confirmado pelo fornecedor. */
  hasRefill: boolean;
};

export type PromiseViolation = {
  network: string;
  kind: "br" | "refill";
  origem: string;
  trecho: string;
};

/** Recorta a frase onde a promessa aparece (para o alerta ficar acionável). */
function frases(texto: string): string[] {
  return String(texto)
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.trim())
    .filter(Boolean);
}

function ehPromessa(frase: string, re: RegExp): boolean {
  if (!re.test(frase)) return false;
  // "Hoje não temos linha brasileira" — a mesma frase nega a promessa.
  const antes = frase.slice(0, frase.search(re));
  return !/\bn[ãa]o\b/i.test(antes) && !NEGATION_RE.test(antes);
}

/**
 * Confere o texto público de UMA rede contra os fatos do catálogo dela.
 * Só acusa promessa a MAIS (vender o que não existe). Texto conservador
 * (não prometer algo que existe) nunca é violação — não gera prejuízo.
 */
export function checkPromiseCoherence(input: {
  network: string;
  facts: PromiseFacts;
  textos: Array<{ origem: string; texto: string }>;
}): PromiseViolation[] {
  const out: PromiseViolation[] = [];
  for (const { origem, texto } of input.textos) {
    for (const frase of frases(texto)) {
      if (!input.facts.hasBr && ehPromessa(frase, CLAIM_BR_RE)) {
        out.push({ network: input.network, kind: "br", origem, trecho: frase });
      }
      if (!input.facts.hasRefill && ehPromessa(frase, CLAIM_REFILL_RE)) {
        out.push({ network: input.network, kind: "refill", origem, trecho: frase });
      }
    }
  }
  return out;
}

/** Pacote é de origem brasileira? Mesma convenção do selo da vitrine. */
export function pacoteEhBr(pacote: string, category: string): boolean {
  const p = String(pacote ?? "");
  // wbr* = visita geo-segmentada, NÃO perfil brasileiro (v330).
  if (/^wbr/i.test(p)) return false;
  return /^br-/i.test(p) || String(category ?? "").endsWith(":br");
}

/** Rede a partir da categoria (`instagram:seguidores` → `instagram`). */
export function redeDaCategoria(category: string): string {
  return String(category ?? "").split(":")[0] ?? "";
}
