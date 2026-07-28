import { describe, it, expect } from "vitest";
import { enforceCategoryCurve } from "@/lib/price-unit-curve";
import { planAuthorityPrices } from "@/lib/price-authority";
import { computeGuardedPrice, respectsMinMargin } from "@/lib/margin-guardian";

const cat = "instagram:seguidores";
const mk = (pacote: string, quantidade: number, price_brl: number) => ({ pacote, category: cat, quantidade, price_brl });

// Categoria com 5 itens: 4 "na curva" (2x o justo) e 1 outlier (6x o justo).
const base = () => [mk("a", 100, 15), mk("b", 200, 30), mk("c", 300, 45), mk("d", 400, 60), mk("out", 500, 300)];
const justo = (r: { quantidade: number }) => r.quantidade / 10; // 10, 20, 30, 40, 50

describe("v326 — curva coerente por categoria", () => {
  it("derruba o outlier caro até a faixa da curva da categoria", () => {
    let rows = base();
    for (let i = 0; i < 10; i++) rows = enforceCategoryCurve(rows, justo).rows;
    const out = rows.find((r) => r.pacote === "out")!;
    // v327: teto de vitrine = 1,6x o justo (50) = 80; nunca abaixo do justo.
    expect(out.price_brl).toBeLessThanOrEqual(80);
    expect(out.price_brl).toBeGreaterThanOrEqual(50);
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

  it("categoria pequena: mediana não age, mas o teto de vitrine age", () => {
    const { fixes } = enforceCategoryCurve([mk("a", 100, 15), mk("b", 500, 999)], justo);
    expect(fixes.map((f) => f.pacote)).toEqual(["b"]);
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

describe("v327 — teto de vitrine por categoria", () => {
  const tk = "tiktok:seguidores";
  const row = (pacote: string, quantidade: number, price_brl: number) => ({ pacote, category: tk, quantidade, price_brl });
  const fair = (r: { quantidade: number }) => r.quantidade * 0.0891; // ~ preço justo real do TikTok

  it("categoria inteira inflada (mediana 3x) também é corrigida", () => {
    let rows = [row("tf500", 500, 87.5), row("tf1k", 1000, 278.5), row("tf5k", 5000, 1389.5), row("tf10k", 10000, 3472.5)];
    for (let i = 0; i < 20; i++) rows = enforceCategoryCurve(rows, fair).rows;
    for (const r of rows) {
      expect(r.price_brl).toBeLessThanOrEqual(fair(r) * 1.6 + 0.01);
      expect(r.price_brl).toBeGreaterThanOrEqual(fair(r) - 0.01);
    }
  });

  it("não desce ninguém que já esteja abaixo do teto", () => {
    const rows = [row("a", 1000, 100), row("b", 2000, 200)];
    expect(enforceCategoryCurve(rows, fair).fixes).toHaveLength(0);
  });

  it("teto nunca quebra a margem mínima de 4x", () => {
    let banco = [
      { pacote: "tf500", category: tk, quantidade: 500, cost_brl: 4.819, price_brl: 87.5 },
      { pacote: "tf1k", category: tk, quantidade: 1000, cost_brl: 9.638, price_brl: 278.5 },
      { pacote: "tf5k", category: tk, quantidade: 5000, cost_brl: 48.19, price_brl: 1389.5 },
      { pacote: "tf10k", category: tk, quantidade: 10000, cost_brl: 96.38, price_brl: 3472.5 },
    ];
    for (let i = 0; i < 40; i++) banco = planAuthorityPrices(banco).rows;
    expect(planAuthorityPrices(banco).changes).toHaveLength(0);
    for (const r of banco) expect(respectsMinMargin(r.price_brl, r.cost_brl)).toBe(true);
    const asc = [...banco].sort((a, b) => a.quantidade - b.quantidade);
    for (let i = 1; i < asc.length; i++) expect(asc[i].price_brl).toBeGreaterThan(asc[i - 1].price_brl);
  });
});
