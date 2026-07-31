// v391 — INVARIANTE: a escada de autonomia não pode mentir.
//
// Detector sem remédio é dívida transferida para o dono. Este teste quebra o
// build se: nível 1 declarado sem executor, executor citado que não existe no
// disco, ou nível 2/3 sem flag/teto/rollback.
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  ACOES,
  contratosQuebrados,
  executoresFantasma,
  grauDeAutonomia,
  nivel1SemExecutor,
  pendentesNoDono,
} from "@/lib/autonomy-ladder";
import { FAMILIAS } from "@/lib/coverage-map";

const SRC = path.resolve(__dirname, "..");

describe("v391 — escada de autonomia", () => {
  it("todo executor citado existe no disco", () => {
    const existentes = ACOES.map((a) => a.executor).filter((f): f is string => !!f)
      .filter((f) => existsSync(path.join(SRC, f)));
    expect(executoresFantasma(existentes)).toEqual([]);
  });

  it("nenhuma ação de nível 1 fica sem quem execute", () => {
    expect(nivel1SemExecutor().map((a) => a.id)).toEqual([]);
  });

  it("nível 2 tem teto e flag; nível 3 tem flag; todos têm rollback", () => {
    expect(contratosQuebrados()).toEqual([]);
  });

  it("toda ação aponta para uma família declarada no mapa de cobertura", () => {
    const ids = new Set(FAMILIAS.map((f) => f.id));
    for (const a of ACOES) expect(ids.has(a.familia)).toBe(true);
  });

  it("dinheiro saindo continua no nível 3", () => {
    const pendentes = pendentesNoDono().map((a) => a.id);
    expect(pendentes).toContain("estorno_automatico");
    expect(pendentes).toContain("recarga_fornecedor");
  });

  it("a maior parte do trabalho braçal é automática", () => {
    expect(grauDeAutonomia()).toBeGreaterThanOrEqual(0.5);
  });
});
