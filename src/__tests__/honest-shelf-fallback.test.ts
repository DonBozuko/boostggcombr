import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// v335 — Trava: categoria 100% pausada NUNCA pode cair no fallback estático.
// Se isso voltar, o cliente vê pacote que o sistema já sabe que não entrega.
describe("prateleira honesta — fallback estático", () => {
  const src = readFileSync(resolve(process.cwd(), "src/hooks/useDynamicPlans.ts"), "utf8");

  it("distingue 'banco respondeu vazio' de 'banco não respondeu'", () => {
    expect(src).toMatch(/loadedBy/);
    expect(src).toMatch(/out\[k\] = loadedBy\[k\] \? \[\] : fallback/);
  });

  it("não usa fallback incondicional quando a categoria vem vazia", () => {
    expect(src).not.toMatch(/if \(!items\.length\) \{ out\[k\] = fallback;/);
  });
});
