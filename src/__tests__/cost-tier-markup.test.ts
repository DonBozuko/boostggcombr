import { describe, it, expect } from "vitest";
import {
  costTierMult,
  computeGuardedPrice,
  respectsMinMargin,
  minNetRatio,
  effectiveProfitMult,
  PROFIT_MULT,
} from "@/lib/margin-guardian";
import { showcaseCap, CATEGORY_MAX_MULT, SHOWCASE_CAP_MIN } from "@/lib/price-unit-curve";
import { maxAllowedDiscount, resellerRespectsMinMargin } from "@/lib/reseller-pricing";

describe("v328 — markup decrescente por custo", () => {
  it("ticket pequeno (Instagram) continua em 5x — nada muda onde há venda real", () => {
    expect(costTierMult(0.19)).toBe(PROFIT_MULT);
    expect(costTierMult(3)).toBe(PROFIT_MULT);
    expect(costTierMult(5)).toBe(PROFIT_MULT);
  });

  it("múltiplo cai conforme o custo sobe e nunca abaixo de 2x", () => {
    const custos = [5, 10, 50, 100, 300, 1000, 5000];
    for (let i = 1; i < custos.length; i++) {
      expect(costTierMult(custos[i])).toBeLessThanOrEqual(costTierMult(custos[i - 1]) + 1e-9);
    }
    expect(costTierMult(50_000)).toBeGreaterThanOrEqual(2.0);
  });

  it("preço total continua crescendo com o custo (não cria pacote maior mais barato)", () => {
    let anterior = 0;
    for (let c = 1; c <= 5000; c *= 1.2) {
      const preco = c * costTierMult(c);
      expect(preco).toBeGreaterThan(anterior);
      anterior = preco;
    }
  });

  it("o preço guardado sempre respeita o próprio piso de margem (idempotente)", () => {
    for (const c of [0.2, 2, 4.2, 41.96, 209.8, 320.79, 4196]) {
      const p = computeGuardedPrice(c, 1000);
      expect(respectsMinMargin(p, c)).toBe(true);
      expect(minNetRatio(c)).toBeGreaterThanOrEqual(1.0);
    }
  });

  it("teto de custo prevalece sobre o escalonamento por quantidade", () => {
    // 100k unidades pediria 12x, mas custo alto limita
    expect(effectiveProfitMult(100_000, 4196)).toBeLessThan(3);
    // custo desconhecido mantém o comportamento antigo
    expect(effectiveProfitMult(100)).toBe(PROFIT_MULT);
  });

  it("YouTube 1k inscritos sai da faixa morta e continua lucrativo", () => {
    const custo = 41.96;
    const preco = computeGuardedPrice(custo, 1000);
    expect(preco).toBeLessThan(250);
    expect(preco).toBeGreaterThan(custo * 2);
  });
});

describe("v328 — teto de vitrine proporcional ao ticket", () => {
  it("isca mantém o prêmio de 1,6x e ticket alto converge para o justo", () => {
    expect(showcaseCap(10)).toBe(CATEGORY_MAX_MULT);
    expect(showcaseCap(50)).toBe(CATEGORY_MAX_MULT);
    expect(showcaseCap(800)).toBe(SHOWCASE_CAP_MIN);
    expect(showcaseCap(150)).toBeLessThan(CATEGORY_MAX_MULT);
    expect(showcaseCap(150)).toBeGreaterThan(SHOWCASE_CAP_MIN);
  });

  it("cap é monotônico decrescente", () => {
    let anterior = 99;
    for (const j of [10, 50, 80, 150, 300, 500, 2000]) {
      const cap = showcaseCap(j);
      expect(cap).toBeLessThanOrEqual(anterior + 1e-9);
      anterior = cap;
    }
  });
});

describe("v328 — revenda acompanha o piso novo", () => {
  it("pacote caro continua tendo desconto de revenda (não zera)", () => {
    const custo = 320.79;
    const varejo = computeGuardedPrice(custo, 100_000);
    expect(maxAllowedDiscount(varejo, custo)).toBeGreaterThan(0);
  });

  it("nunca concede desconto que fure o piso de lucro da revenda", () => {
    for (const custo of [0.2, 3, 41.96, 320.79, 4196]) {
      const varejo = computeGuardedPrice(custo, 1000);
      const d = maxAllowedDiscount(varejo, custo);
      expect(resellerRespectsMinMargin(varejo * (1 - d), custo)).toBe(true);
    }
  });
});
