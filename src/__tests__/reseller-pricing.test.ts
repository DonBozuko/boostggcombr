import { describe, it, expect } from "vitest";
import {
  quoteReseller,
  maxAllowedDiscount,
  resellerRespectsMinMargin,
  RESELLER_MAX_DISCOUNT,
  RESELLER_MIN_RATIO,
} from "@/lib/reseller-pricing";

describe("v261 — preço de revenda nunca fura margem", () => {
  it("aplica o desconto contratado quando a margem permite", () => {
    // custo 2, varejo 20 (10x) → 15% de desconto é folgado
    const q = quoteReseller({ catalogPrice: 20, costBrl: 2, descontoPct: 0.15 });
    expect(q.price).toBe(17);
    expect(q.clamped).toBe(false);
    expect(resellerRespectsMinMargin(q.price, 2)).toBe(true);
  });

  it("corta o desconto quando o piso de lucro seria furado", () => {
    // custo 5, varejo 18 → margem apertada, 30% quebraria o piso
    const q = quoteReseller({ catalogPrice: 18, costBrl: 5, descontoPct: 0.30 });
    expect(q.clamped).toBe(true);
    expect(resellerRespectsMinMargin(q.price, 5)).toBe(true);
  });

  it("nunca passa do teto de 30%", () => {
    const q = quoteReseller({ catalogPrice: 100, costBrl: 1, descontoPct: 0.9 });
    expect(q.discount).toBeLessThanOrEqual(RESELLER_MAX_DISCOUNT);
  });

  it("sem custo conhecido cobra varejo cheio (fail-closed)", () => {
    const q = quoteReseller({ catalogPrice: 30, costBrl: 0, descontoPct: 0.2 });
    expect(q.price).toBe(30);
    expect(q.discount).toBe(0);
  });

  it("desconto máximo respeita a razão mínima de lucro", () => {
    for (const [price, cost] of [[20, 2], [50, 9], [13, 4], [200, 30]] as const) {
      const d = maxAllowedDiscount(price, cost);
      const p = Number((price * (1 - d)).toFixed(2));
      if (d > 0) expect(resellerRespectsMinMargin(p, cost)).toBe(true);
    }
    expect(RESELLER_MIN_RATIO).toBe(2.5);
  });

  it("preço de revenda é sempre ≤ varejo e > 0", () => {
    const q = quoteReseller({ catalogPrice: 12, costBrl: 1.2, descontoPct: 0.2 });
    expect(q.price).toBeLessThanOrEqual(q.retail);
    expect(q.price).toBeGreaterThan(0);
  });
});
