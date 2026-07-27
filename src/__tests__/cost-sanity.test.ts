import { describe, it, expect } from "vitest";
import { costIsSane } from "@/lib/cost-sanity";

describe("v294 — trava de sanidade de custo", () => {
  it("aceita custo próximo da referência", () => {
    expect(costIsSane(4.4, 4.41)).toBe(true);
    expect(costIsSane(6.0, 4.41)).toBe(true);
    expect(costIsSane(2.0, 4.41)).toBe(true);
  });

  it("rejeita o caso yv1k (R$0,20 vs R$4,41)", () => {
    expect(costIsSane(0.2, 4.41)).toBe(false);
  });

  it("rejeita custo absurdamente alto (serviço errado caro)", () => {
    expect(costIsSane(122000, 4.41)).toBe(false);
  });

  it("não bloqueia quando falta informação", () => {
    expect(costIsSane(null, 4.41)).toBe(true);
    expect(costIsSane(4.41, null)).toBe(true);
    expect(costIsSane(0, 0)).toBe(true);
  });

  it("respeita exatamente os limites da faixa", () => {
    expect(costIsSane(1, 4)).toBe(true);    // ratio 0.25
    expect(costIsSane(4, 1)).toBe(true);    // ratio 4
    expect(costIsSane(0.99, 4)).toBe(false);
    expect(costIsSane(4.01, 1)).toBe(false);
  });
});
