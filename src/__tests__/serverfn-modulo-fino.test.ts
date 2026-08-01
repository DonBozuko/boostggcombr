import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// v399 — Blindagem de Server Functions.
//
// Por que este teste existe: o divisor de bundle da TanStack pode apagar helpers
// declarados no escopo de módulo de um arquivo .functions.ts. Quando isso
// acontece, admin e despacho quebram em produção com ReferenceError, mesmo com
// o typecheck verde. Regra: .functions.ts só declara imports, tipos e as server
// functions exportadas. Qualquer helper vive em outro módulo.
const DIR = join(process.cwd(), "src/lib");

const arquivos = readdirSync(DIR).filter((f) => f.endsWith(".functions.ts"));

describe("server functions são módulos finos", () => {
  it("existe pelo menos um arquivo de server function para inspecionar", () => {
    expect(arquivos.length).toBeGreaterThan(5);
  });

  for (const nome of arquivos) {
    it(`${nome} não declara função solta no escopo de módulo`, () => {
      const src = readFileSync(join(DIR, nome), "utf8");
      const soltas = src
        .split("\n")
        .filter((l) => /^(export\s+)?(async\s+)?function\s/.test(l));
      expect(soltas).toEqual([]);
    });
  }

  it("nenhum arquivo de server function tem seu próprio verificador de token", () => {
    const culpados = arquivos.filter((nome) =>
      /function\s+(checkToken|authorized|auth)\s*\(/.test(readFileSync(join(DIR, nome), "utf8")),
    );
    expect(culpados).toEqual([]);
  });
});
