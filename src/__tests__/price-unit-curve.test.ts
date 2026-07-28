import { describe, it, expect } from "vitest";
import { enforceUnitCoherence } from "@/lib/price-unit-curve";
import { planAuthorityPrices } from "@/lib/price-authority";
import { computeGuardedPrice, respectsMinMargin } from "@/lib/margin-guardian";

const cat = "instagram:seguidores";

describe("v326 — curva de desconto por volume coerente", () => {
  it("pacote maior nunca custa mais por unidade que um menor", () => {
    const rows = [
      { pacote: "p500", category: cat, quantidade: 500, price_brl: 19 },
      { pacote: "p750", category: cat, quantidade: 750, price_brl: 44.5 },
    ];
    let out = rows;
    for (let i = 0; i < 10; i++) out = enforceUnitCoherence(out, () => 5).rows;
    const p750 = out.find((r) => r.pacote === "p750")!;
    expect(p750.price_brl).toBeLessThan(44.5);
    expect(p750.price_brl / 750).toBeLessThanOrEqual(19 / 500 + 1e-9);
  });

  it("nunca corrige abaixo do piso (margem protegida)", () => {
    const rows = [
      { pacote: "a", category: cat, quantidade: 500, price_brl: 10 },
      { pacote: "b", category: cat, quantidade: 750, price_brl: 40 },
    ];
    const { rows: out } = enforceUnitCoherence(rows, () => 36);
    expect(out.find((r) => r.pacote === "b")!.price_brl).toBe(36);
  });

  it("queda máxima de 20% por ciclo (sem choque na vitrine)", () => {
    const rows = [
      { pacote: "a", category: cat, quantidade: 500, price_brl: 10 },
      { pacote: "b", category: cat, quantidade: 750, price_brl: 100 },
    ];
    const { rows: out } = enforceUnitCoherence(rows, () => 5);
    expect(out.find((r) => r.pacote === "b")!.price_brl).toBe(80);
  });

  it("nunca aumenta preço", () => {
    const rows = [
      { pacote: "a", category: cat, quantidade: 500, price_brl: 50 },
      { pacote: "b", category: cat, quantidade: 750, price_brl: 20 },
    ];
    const { rows: out } = enforceUnitCoherence(rows, () => 5);
    expect(out.find((r) => r.pacote === "b")!.price_brl).toBe(20);
  });

  it("autoridade: converge e mantém margem 4x em todos os pacotes", () => {
    let banco = [
      { pacote: "p500", category: cat, quantidade: 500, cost_brl: 0.9635, price_brl: 19 },
      { pacote: "p750", category: cat, quantidade: 750, cost_brl: 1.4452, price_brl: 44.5 },
      { pacote: "p1k", category: cat, quantidade: 1000, cost_brl: 1.927, price_brl: 59.5 },
      { pacote: "p5k", category: cat, quantidade: 5000, cost_brl: 9.635, price_brl: 130 },
    ];
    for (let i = 0; i < 20; i++) banco = planAuthorityPrices(banco).rows;
    // estabilizou
    expect(planAuthorityPrices(banco).changes).toHaveLength(0);
    for (const r of banco) {
      expect(respectsMinMargin(r.price_brl, r.cost_brl)).toBe(true);
      expect(r.price_brl).toBeGreaterThanOrEqual(computeGuardedPrice(r.cost_brl, r.quantidade) - 0.01);
    }
    // escada de total continua íntegra
    const asc = [...banco].sort((a, b) => a.quantidade - b.quantidade);
    for (let i = 1; i < asc.length; i++) expect(asc[i].price_brl).toBeGreaterThan(asc[i - 1].price_brl);
  });
});
