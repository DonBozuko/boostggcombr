// v332 — Varredura de superfície (runtime).
// Lê o código-fonte de todas as rotas públicas (embutido no build), extrai o
// texto que o cliente lê e confronta com o catálogo real da rede daquela rota.

import {
  checkPromiseCoherence,
  type PromiseViolation,
} from "@/lib/promise-coherence";
import { extrairTextoVisivel, redeDaRota } from "@/lib/surface-text";
import { rotasNaoDeclaradas } from "@/lib/coverage-map";
import { loadCatalogFacts } from "@/services/promise-coherence.server";

const FONTES = import.meta.glob("/src/routes/**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export async function runSurfaceScan(): Promise<{
  violacoes: PromiseViolation[];
  rotasSemDeclaracao: string[];
  rotasVarridas: number;
}> {
  const facts = await loadCatalogFacts();
  const violacoes: PromiseViolation[] = [];
  const nomes: string[] = [];

  for (const [path, source] of Object.entries(FONTES)) {
    const rede = redeDaRota(path);
    if (!rede) continue;
    const nome = path.split("/").pop()!.replace(/\.tsx?$/, "");
    nomes.push(nome);

    const f = facts.get(rede);
    if (!f) continue; // rede sem catálogo mapeado: nada a comparar

    const textos = extrairTextoVisivel(source).map((texto) => ({
      origem: `Página /${nome}`,
      texto,
    }));
    violacoes.push(...checkPromiseCoherence({ network: rede, facts: f, textos }));
  }

  return {
    violacoes,
    rotasSemDeclaracao: rotasNaoDeclaradas(nomes),
    rotasVarridas: nomes.length,
  };
}
