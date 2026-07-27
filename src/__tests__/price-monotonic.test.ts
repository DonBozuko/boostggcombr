import { describe, it, expect } from "vitest";
import { enforceMonotonicLadder, nextStepFloor } from "@/lib/price-monotonic";

const row = (pacote: string, quantidade: number, price_brl: number, category = "instagram:seguidores") =>
  ({ pacote, category, quantidade, price_brl });

describe("v292 — trava de monotonicidade de preço", () => {
  it("corrige escada invertida empurrando o maior para cima", () => {
    const { rows, fixes } = enforceMonotonicLadder([
      row("p100", 100, 22.28),
      row("p250", 250, 8.8),
    ]);
    expect(fixes).toHaveLength(1);
    const p250 = rows.find((r) => r.pacote === "p250")!;
    expect(p250.price_brl).toBeGreaterThan(22.28);
    expect(rows.find((r) => r.pacote === "p100")!.price_brl).toBe(22.28);
  });

  it("nunca reduz preço de nenhum pacote (não come margem)", () => {
    const input = [row("p100", 100, 10), row("p200", 200, 5), row("p300", 300, 6)];
    const { rows } = enforceMonotonicLadder(input);
    for (const orig of input) {
      const out = rows.find((r) => r.pacote === orig.pacote)!;
      expect(out.price_brl).toBeGreaterThanOrEqual(orig.price_brl);
    }
  });

  it("não mexe em escada já correta", () => {
    const { fixes } = enforceMonotonicLadder([
      row("p100", 100, 10),
      row("p200", 200, 18),
      row("p500", 500, 40),
    ]);
    expect(fixes).toHaveLength(0);
  });

  it("trata categorias de forma independente", () => {
    const { fixes } = enforceMonotonicLadder([
      row("p100", 100, 30, "instagram:seguidores"),
      row("l1k", 1000, 12, "instagram:curtidas"),
    ]);
    expect(fixes).toHaveLength(0);
  });

  it("empate de preço também é degrau quebrado", () => {
    const { fixes } = enforceMonotonicLadder([row("p100", 100, 10), row("p200", 200, 10)]);
    expect(fixes).toHaveLength(1);
  });

  it("propaga a correção pela escada inteira", () => {
    const { rows } = enforceMonotonicLadder([
      row("p100", 100, 50),
      row("p200", 200, 10),
      row("p300", 300, 12),
    ]);
    const p200 = rows.find((r) => r.pacote === "p200")!.price_brl;
    const p300 = rows.find((r) => r.pacote === "p300")!.price_brl;
    expect(p200).toBeGreaterThan(50);
    expect(p300).toBeGreaterThan(p200);
  });

  it("ignora preços inválidos sem quebrar", () => {
    const { fixes } = enforceMonotonicLadder([row("a", 100, 0), row("b", 200, 10)]);
    expect(fixes).toHaveLength(0);
  });

  it("degrau mínimo é R$ 0,50 e sobe 3% em preços altos", () => {
    expect(nextStepFloor(10)).toBe(10.5);
    expect(nextStepFloor(1000)).toBe(1030);
  });
});
