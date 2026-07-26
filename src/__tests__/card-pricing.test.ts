import { describe, it, expect } from "vitest";
import { cardAmount, cardBlockedReason, CARD_MAX_BRL, CARD_SURCHARGE } from "@/lib/card-pricing";

describe("v270 — preço no cartão", () => {
  it("repassa a taxa e nunca cobra menos que o Pix", () => {
    for (const pix of [5, 12, 18, 30, 65, 120]) {
      expect(cardAmount(pix)).toBeGreaterThan(pix);
      expect(cardAmount(pix)).toBeGreaterThanOrEqual(pix * (1 + CARD_SURCHARGE));
    }
  });

  it("arredonda para cima no centavo (nunca perde fração)", () => {
    expect(cardAmount(18)).toBe(19.26);
    expect(cardAmount(5)).toBe(5.35);
  });

  it("bloqueia cartão acima do teto antifraude", () => {
    expect(cardBlockedReason(100)).toBeNull();
    expect(cardBlockedReason(CARD_MAX_BRL)).toBe("CARD_LIMIT");
    expect(cardBlockedReason(1000)).toBe("CARD_LIMIT");
  });

  it("bloqueia valor abaixo do mínimo do cartão", () => {
    expect(cardBlockedReason(1)).toBe("CARD_MIN");
  });
});
