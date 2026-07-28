import { describe, it, expect } from "vitest";
import { computeGuardedPrice, respectsMinMargin } from "@/lib/margin-guardian";

// v348 — O preço que o motor gera NUNCA pode ser reprovado pela própria trava.
// Regressão real: br-tf100 (custo R$ 1,1508) saía da vitrine por 0,0007 de
// diferença de arredondamento.
describe("v348 — motor de preço e trava de margem não podem se contradizer", () => {
  const custos = [0.35, 1.1508, 2.4, 5, 12.7, 41.96, 100.5, 301, 1205, 4196];
  const quantidades = [100, 500, 1000, 5000, 10000, 50000, 500000];

  for (const custo of custos) {
    for (const qty of quantidades) {
      it(`custo R$ ${custo} / ${qty} un — preço guardado passa na trava`, () => {
        const preco = computeGuardedPrice(custo, qty);
        expect(respectsMinMargin(preco, custo)).toBe(true);
      });
    }
  }

  it("caso exato br-tf100 continua vendável", () => {
    expect(respectsMinMargin(7.25, 1.1508)).toBe(true);
  });

  it("preço abaixo do custo continua reprovado", () => {
    expect(respectsMinMargin(1.0, 1.1508)).toBe(false);
    expect(respectsMinMargin(4.0, 1.1508)).toBe(false);
  });
});
