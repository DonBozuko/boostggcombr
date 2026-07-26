import { describe, it, expect } from "vitest";
import {
  affiliateCommission,
  normalizeRefCode,
  AFFILIATE_DEFAULT_PCT,
  AFFILIATE_MAX_PCT,
  AFFILIATE_MIN_ORDER_BRL,
} from "@/lib/affiliate";

describe("v265 — comissão de afiliado não fura a margem", () => {
  it("paga 10% do pedido no padrão", () => {
    expect(affiliateCommission(50, AFFILIATE_DEFAULT_PCT)).toBe(5);
  });

  it("não paga em pedido abaixo do mínimo", () => {
    expect(affiliateCommission(AFFILIATE_MIN_ORDER_BRL - 0.01, 0.1)).toBe(0);
    expect(affiliateCommission(5, 0.1)).toBe(0);
  });

  it("respeita o teto duro mesmo com pct absurdo", () => {
    expect(affiliateCommission(100, 0.9)).toBe(100 * AFFILIATE_MAX_PCT);
  });

  it("arredonda pra baixo (nunca paga centavo a mais)", () => {
    expect(affiliateCommission(33.33, 0.1)).toBe(3.33);
  });

  it("pct inválido ou negativo não gera comissão", () => {
    expect(affiliateCommission(100, Number.NaN)).toBe(0);
    expect(affiliateCommission(100, -0.5)).toBe(0);
  });

  it("normaliza código de indicação e descarta lixo", () => {
    expect(normalizeRefCode(" maria4k2z ")).toBe("MARIA4K2Z");
    expect(normalizeRefCode("ab")).toBeNull();
    expect(normalizeRefCode(null)).toBeNull();
    expect(normalizeRefCode("<script>x</script>")).toBe("SCRIPTXSCRIPT");
  });
});
