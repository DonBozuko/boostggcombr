// v364 — INVARIANTE: quando o sistema não consegue provar que entrega,
// pacote caro NÃO pode ser cobrado. Pacote barato continua vendendo.
//
// Regressão real: p15k R$283,44 cobrado e estornado depois porque o preflight
// deu timeout e a venda passou mesmo assim.
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/whatsapp-alert.server", () => ({
  dispatchWhatsappAlert: vi.fn(async () => {}),
}));

vi.mock("@/lib/smart-routing.server", () => ({
  rankProvidersByCost: vi.fn(async () => {
    throw new Error("fornecedor fora do ar");
  }),
}));

describe("v364 — fail-open tem teto de valor", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("pacote caro sem prova de rota NÃO é cobrado", async () => {
    const { preflightRouteOrBlock } = await import("@/lib/route-preflight.server");
    const r = await preflightRouteOrBlock({ pacote: "p15k", quantidade: 15000, valorBrl: 283.44 });
    expect(r.ok).toBe(false);
    expect(r.skipped).toBe(false);
  });

  it("pacote barato continua vendendo mesmo sem veredito", async () => {
    const { preflightRouteOrBlock } = await import("@/lib/route-preflight.server");
    const r = await preflightRouteOrBlock({ pacote: "ig1k", quantidade: 1000, valorBrl: 19.9 });
    expect(r.ok).toBe(true);
    expect(r.skipped).toBe(true);
  });
});
