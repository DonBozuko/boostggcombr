// v351 — INVARIANTE: custo só pode vir de fornecedor que entrega a quantidade.
//
// Caso real que originou a trava: yv10m (10 milhões de views YouTube) tinha o
// preço calculado com o custo do fornecedor cujo serviço aceita no máximo
// 1 milhão. No despacho esse fornecedor é descartado (v286) e sobrava só o
// caro — preço R$ 78 mil contra custo real R$ 92 mil. O pacote vivia pausado
// por "venderia no prejuízo" e o motivo apontava para o lugar errado.

import { describe, it, expect } from "vitest";
import { serviceAcceptsQty } from "@/lib/critical-guards";

describe("v351 — custo só de quem entrega a quantidade", () => {
  it("descarta fornecedor cujo teto é menor que o pacote", () => {
    expect(serviceAcceptsQty({ min: 100, max: 1_000_000 }, 10_000_000)).toBe(false);
    expect(serviceAcceptsQty({ min: 10, max: 20_000 }, 500_000)).toBe(false);
  });

  it("descarta fornecedor cujo mínimo é maior que o pacote", () => {
    expect(serviceAcceptsQty({ min: 25_000, max: 100_000_000 }, 1_000)).toBe(false);
  });

  it("aceita fornecedor dentro da faixa", () => {
    expect(serviceAcceptsQty({ min: 10, max: 1_000_000 }, 500_000)).toBe(true);
    expect(serviceAcceptsQty({ min: 25_000, max: 100_000_000 }, 10_000_000)).toBe(true);
  });

  it("faixa desconhecida nunca bloqueia (não parar venda por falta de dado)", () => {
    expect(serviceAcceptsQty({}, 1_000)).toBe(true);
    expect(serviceAcceptsQty(null, 1_000)).toBe(true);
    expect(serviceAcceptsQty({ min: 0, max: 0 }, 1_000)).toBe(true);
  });

  it("escolhe o custo de quem entrega, não o mais barato inviável", () => {
    const qty = 10_000_000;
    const candidatos = [
      { slug: "smmhype", rate: 0.63, min: 100, max: 1_000_000 },
      { slug: "verified", rate: 9.2, min: 25_000, max: 100_000_000 },
    ];
    const viaveis = candidatos
      .filter((c) => serviceAcceptsQty(c, qty))
      .map((c) => ({ slug: c.slug, cost: (c.rate * qty) / 1000 }));
    const melhor = viaveis.reduce((a, b) => (b.cost < a.cost ? b : a));
    expect(melhor.slug).toBe("verified");
    expect(melhor.cost).toBe(92_000);
  });
});
