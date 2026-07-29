import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// v360 — INVARIANTE: o custo que decide margem sai do MESMO serviço que o
// dispatch vai usar.
//
// Regressão real (loop "PACOTE APOSENTADO" nos pacotes de YouTube Views):
// `rankProvidersByCost` lia a tarifa da smmhype de `services_cache` pelo ID
// SEMENTE do código (14321, teto 1M, US$ 0,63) enquanto o vínculo do banco era
// 18785 (teto 10M, US$ 0,44). O motor de preço formava o preço com um custo e a
// Bancada julgava a margem com outro → pausa → religa → alerta idêntico eterno.
const src = readFileSync(
  resolve(process.cwd(), "src/lib/smart-routing.server.ts"),
  "utf8",
);

describe("v360 — custo da smmhype vem do serviço vinculado", () => {
  it("lê a tarifa pelo ID vinculado (providerIdMap), não só pelo ID semente", () => {
    expect(src).toContain('const smmhypeBoundId = providerIdMap["smmhype"]');
    expect(src).toContain("smmhype_services_cache");
  });

  it("o ID semente só é usado quando NÃO existe vínculo", () => {
    const trecho = src.slice(src.indexOf("const smmhypeBoundId"));
    const usoSemente = trecho.indexOf("(svc as any)?.rate");
    const elseIdx = trecho.indexOf("} else {");
    expect(usoSemente).toBeGreaterThan(-1);
    expect(elseIdx).toBeGreaterThan(-1);
    // a leitura da semente tem de estar DEPOIS do `else` (caminho sem vínculo)
    expect(usoSemente).toBeGreaterThan(elseIdx);
  });
});
