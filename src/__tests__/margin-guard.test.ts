import { describe, it, expect } from "vitest";
import {
  computeGuardedPrice,
  estimateNetProfit,
  respectsMinMargin,
  scaledFloor,
  effectiveProfitMult,
  FLOOR_BRL,
} from "@/lib/margin-guardian";
import { applyProfitFormula } from "@/lib/profit-markup";

// FLUXO 5 — Margem. Se isto quebrar, vendemos no prejuízo sem ninguém notar.
describe("trava de margem", () => {
  it("nunca vende abaixo do piso", () => {
    expect(computeGuardedPrice(0.01, 100)).toBeGreaterThanOrEqual(FLOOR_BRL);
    expect(computeGuardedPrice(0.0001, 50)).toBeGreaterThanOrEqual(FLOOR_BRL);
  });

  it("preço garante lucro líquido de pelo menos 4x o custo", () => {
    for (const [cost, qty] of [[0.5, 100], [2, 1000], [8, 5000], [30, 20000]] as const) {
      const price = computeGuardedPrice(cost, qty);
      expect(respectsMinMargin(price, cost)).toBe(true);
    }
  });

  it("lucro líquido considera cupom e taxa do Pix", () => {
    // R$100 de venda, custo R$10 → líquido bem abaixo de R$90 por causa das taxas
    const net = estimateNetProfit(100, 10);
    expect(net).toBeLessThan(90);
    expect(net).toBeGreaterThan(0);
  });

  it("custo inválido não gera preço", () => {
    expect(computeGuardedPrice(0, 100)).toBe(0);
    expect(computeGuardedPrice(Number.NaN, 100)).toBe(0);
    expect(respectsMinMargin(50, 0)).toBe(false);
  });

  it("piso e multiplicador são monotônicos (preço nunca cai ao subir quantidade)", () => {
    const qtys = [50, 100, 500, 1000, 3000, 5000, 10000, 15000, 50000];
    for (let i = 1; i < qtys.length; i++) {
      expect(scaledFloor(qtys[i])).toBeGreaterThanOrEqual(scaledFloor(qtys[i - 1]));
      expect(effectiveProfitMult(qtys[i])).toBeGreaterThanOrEqual(effectiveProfitMult(qtys[i - 1]));
    }
  });

  it("vitrine (cliente) nunca mostra preço abaixo da trava do servidor", () => {
    const plans = [
      { valor: 0.5, price: "", quantidade: 100 },
      { valor: 3, price: "", quantidade: 1000 },
      { valor: 12, price: "", quantidade: 10000 },
    ];
    for (const p of applyProfitFormula(plans)) {
      const original = plans.find((x) => x.quantidade === p.quantidade)!;
      expect(p.valor).toBeGreaterThanOrEqual(computeGuardedPrice(original.valor, p.quantidade) - 0.01);
      expect(respectsMinMargin(p.valor, original.valor)).toBe(true);
    }
  });
});
