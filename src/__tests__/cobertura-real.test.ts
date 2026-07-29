// v366 — INVARIANTE: o mapa de cobertura não pode mentir.
//
// Causa raiz de "a cada pergunta aparece um erro novo": o inventário de
// detectores era texto livre. Podia citar detector que não existe, e teste
// novo podia ficar fora de qualquer família (aterro). Agora o mapa é
// conferido contra o disco a cada build.
import { describe, expect, it } from "vitest";
import { readdirSync } from "node:fs";
import path from "node:path";
import {
  FAMILIAS,
  familiasSemDetector,
  provasFantasma,
  testesOrfaos,
} from "@/lib/coverage-map";

const DIR = path.resolve(__dirname);
const ARQUIVOS = readdirSync(DIR).filter((f) => f.endsWith(".test.ts"));

describe("v366 — mapa de cobertura com dente", () => {
  it("toda prova citada existe de verdade no disco", () => {
    expect(provasFantasma(ARQUIVOS)).toEqual([]);
  });

  it("nenhum teste fica órfão fora do inventário", () => {
    // este próprio arquivo é o auditor, não uma família
    const orfaos = testesOrfaos(ARQUIVOS).filter((f) => f !== "cobertura-real.test.ts");
    expect(orfaos).toEqual([]);
  });

  it("nenhuma família fica sem detector nem sem prova", () => {
    expect(familiasSemDetector().map((f) => f.id)).toEqual([]);
  });

  it("as famílias do caminho do dinheiro estão declaradas", () => {
    const ids = new Set(FAMILIAS.map((f) => f.id));
    for (const critica of [
      "preco_margem",
      "custo_real",
      "preflight",
      "caixa",
      "entrega",
      "prateleira",
      "vinculo",
      "revenda",
    ]) {
      expect(ids.has(critica)).toBe(true);
    }
  });
});
