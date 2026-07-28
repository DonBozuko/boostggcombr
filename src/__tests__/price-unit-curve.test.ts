import { describe, it, expect } from "vitest";
import { enforceCategoryCurve } from "@/lib/price-unit-curve";
import { planAuthorityPrices } from "@/lib/price-authority";
import { computeGuardedPrice, respectsMinMargin } from "@/lib/margin-guardian";

const cat = "instagram:seguidores";
const mk = (pacote: string, quantidade: number, price_brl: number) => ({ pacote, category: cat, quantidade, price_brl });

// Categoria com 5 itens: 4 "na curva" (2x o justo) e 1 outlier (6x o justo).
const base = () => [mk("a", 100, 20), mk("b", 200, 40), mk("c", 300, 60), mk("d", 400, 80), mk("out", 500, 300)];
const justo = (r: { quantidade: number }) => r.quantidade / 10; // 10, 20, 30, 40, 50

describe("v326 — curva coerente por categoria", () => {
  it("derruba o outlier caro até a curva da categoria (mediana)", () => {
    let rows = base();
    for (let i = 0; i < 10; i++) rows = enforceCategoryCurve(rows, justo).rows;
    const out = rows.find((r) => r.pacote === "out")!;
    expect(out.price_brl).toBeCloseTo(100, 1); // mediana 2x × justo 50
  });

  it("não mexe em quem está dentro da curva", () => {
    const { fixes } = enforceCategoryCurve(base(), justo);
    expect(fixes.map((f) => f.pacote)).toEqual(["out"]);
  });

  it("nunca desce abaixo do preço justo", () => {
    let rows = base();
    for (let i = 0; i < 20; i++) rows = enforceCategoryCurve(rows, (r) => r.quantidade / 10 + 200).rows;
    for (const r of rows) expect(r.price_brl).toBeGreaterThanOrEqual(Math.min(r.price_brl, r.quantidade / 10));
  });

  it("queda máxima de 20% por ciclo (sem choque na vitrine)", () => {
    const { rows } = enforceCategoryCurve(base(), justo);
    expect(rows.find((r) => r.pacote === "out")!.price_brl).toBe(240);
  });

  it("nunca aumenta preço", () => {
    const antes = base();
    const { rows } = enforceCategoryCurve(antes, justo);
    for (const a of antes) {
      expect(rows.find((r) => r.pacote === a.pacote)!.price_brl).toBeLessThanOrEqual(a.price_brl);
    }
  });

  it("categoria pequena (menos de 4 pacotes) não é tocada", () => {
    const { fixes } = enforceCategoryCurve([mk("a", 100, 20), mk("b", 500, 999)], justo);
    expect(fixes).toHaveLength(0);
  });

  it("autoridade: converge, mantém margem 4x e escada íntegra", () => {
    let banco = [
      { pacote: "p300", category: cat, quantidade: 300, cost_brl: 0.5781, price_brl: 11.55 },
      { pacote: "p500", category: cat, quantidade: 500, cost_brl: 0.9635, price_brl: 19 },
      { pacote: "p750", category: cat, quantidade: 750, cost_brl: 1.4452, price_brl: 44.5 },
      { pacote: "p1k", category: cat, quantidade: 1000, cost_brl: 1.927, price_brl: 59.5 },
      { pacote: "p5k", category: cat, quantidade: 5000, cost_brl: 9.635, price_brl: 130 },
    ];
    for (let i = 0; i < 30; i++) banco = planAuthorityPrices(banco).rows;
    expect(planAuthorityPrices(banco).changes).toHaveLength(0);
    for (const r of banco) {
      expect(respectsMinMargin(r.price_brl, r.cost_brl)).toBe(true);
      expect(r.price_brl).toBeGreaterThanOrEqual(computeGuardedPrice(r.cost_brl, r.quantidade) - 0.01);
    }
    const asc = [...banco].sort((a, b) => a.quantidade - b.quantidade);
    for (let i = 1; i < asc.length; i++) expect(asc[i].price_brl).toBeGreaterThan(asc[i - 1].price_brl);
  });
});
