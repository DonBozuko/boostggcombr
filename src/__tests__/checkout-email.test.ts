import { describe, it, expect } from "vitest";
import {
  normalizeCheckoutEmail,
  checkoutEmailError,
  isFakeCheckoutEmail,
} from "@/lib/checkout-email";

// v315 — trava: nunca mais aceitar pedido sem contato real do cliente.
// Sem e-mail válido não existe recuperação de carrinho nem aviso de status.
describe("checkout-email (v315)", () => {
  it("recusa e-mail vazio", () => {
    expect(normalizeCheckoutEmail("")).toBeNull();
    expect(checkoutEmailError("")).toBeTruthy();
  });

  it("recusa e-mail inválido", () => {
    expect(normalizeCheckoutEmail("aaa")).toBeNull();
    expect(checkoutEmailError("joao@")).toBeTruthy();
  });

  it("recusa o fallback falso antigo que matava a recuperação", () => {
    expect(normalizeCheckoutEmail("cliente@tiktok.eliteboostprime.com")).toBeNull();
    expect(checkoutEmailError("cliente@kwai.eliteboostprime.com")).toBeTruthy();
    expect(isFakeCheckoutEmail("cliente@youtube.eliteboostprime.com")).toBe(true);
  });

  it("aceita e normaliza e-mail real", () => {
    expect(normalizeCheckoutEmail("  Joao@Gmail.COM ")).toBe("joao@gmail.com");
    expect(checkoutEmailError("joao@gmail.com")).toBeNull();
    expect(isFakeCheckoutEmail("joao@gmail.com")).toBe(false);
  });

  it("marca como falso o histórico anonimizado e de webhook", () => {
    expect(isFakeCheckoutEmail("x@webhook")).toBe(true);
    expect(isFakeCheckoutEmail("[anonimizado-lgpd]")).toBe(true);
    expect(isFakeCheckoutEmail(null)).toBe(true);
  });
});
