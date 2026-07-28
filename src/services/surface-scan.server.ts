// v332 — Varredura de superfície (runtime).
// Lê o código-fonte de todas as rotas públicas (embutido no build), extrai o
// texto que o cliente lê e confronta com o catálogo real da rede daquela rota.
//
// v333 — passa a varrer também as PROVAS VISUAIS (imagens) e os E-MAILS
// transacionais, fechando as duas famílias que estavam sem detector.

import {
  checkPromiseCoherence,
  type PromiseViolation,
} from "@/lib/promise-coherence";
import { extrairTextoVisivel, redeDaRota } from "@/lib/surface-text";
import { rotasNaoDeclaradas } from "@/lib/coverage-map";
import { checkVisualCoherence, type VisualViolation } from "@/lib/asset-coherence";
import { checkEmailCoherence, type EmailViolation } from "@/lib/email-coherence";
import { loadCatalogFacts } from "@/services/promise-coherence.server";

const FONTES = import.meta.glob("/src/routes/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const EMAILS = import.meta.glob("/src/lib/email-templates/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

// Chaves apenas (glob preguiçoso não carrega nada): inventário de /public.
const PUBLICOS = new Set(
  Object.keys(import.meta.glob("/public/**/*", { eager: false })).map((p) =>
    p.replace(/^\/public/, ""),
  ),
);

export async function runSurfaceScan(): Promise<{
  violacoes: PromiseViolation[];
  visuais: VisualViolation[];
  emails: EmailViolation[];
  rotasSemDeclaracao: string[];
  rotasVarridas: number;
}> {
  const facts = await loadCatalogFacts();
  const violacoes: PromiseViolation[] = [];
  const visuais: VisualViolation[] = [];
  const nomes: string[] = [];

  for (const [path, source] of Object.entries(FONTES)) {
    const rede = redeDaRota(path);
    if (!rede) continue;
    const nome = path.split("/").pop()!.replace(/\.tsx?$/, "");
    nomes.push(nome);

    const f = facts.get(rede);

    // Provas visuais valem mesmo sem catálogo mapeado (arquivo ausente/sem alt).
    visuais.push(
      ...checkVisualCoherence({
        origem: `Página /${nome}`,
        source,
        facts: f,
        arquivosExistentes: PUBLICOS,
      }),
    );

    if (!f) continue; // rede sem catálogo mapeado: nada a comparar em promessa

    const textos = extrairTextoVisivel(source).map((texto) => ({
      origem: `Página /${nome}`,
      texto,
    }));
    violacoes.push(...checkPromiseCoherence({ network: rede, facts: f, textos }));
  }

  // E-mails falam de todas as redes: só é mentira se NENHUMA rede entrega.
  const agregado = {
    hasBr: Array.from(facts.values()).some((f) => f.hasBr),
    hasRefill: Array.from(facts.values()).some((f) => f.hasRefill),
  };
  const emails: EmailViolation[] = [];
  for (const [path, source] of Object.entries(EMAILS)) {
    const nome = path.split("/").pop()!.replace(/\.tsx?$/, "");
    emails.push(checkEmailCoherence({ template: nome, source, facts: agregado }).length
      ? ...[]
      : ...[]);
  }

  return {
    violacoes,
    visuais,
    emails,
    rotasSemDeclaracao: rotasNaoDeclaradas(nomes),
    rotasVarridas: nomes.length,
  };
}
