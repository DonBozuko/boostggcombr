import { describe, expect, it, vi, beforeEach } from "vitest";
import { criarPedido } from "../lib/pedidos.functions";

// Mock das dependências para isolar o orquestrador
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "p-123" }, error: null }),
  },
}));

vi.mock("./mercadopago.server", () => ({
  createMercadoPagoPixPayment: vi.fn().mockResolvedValue({
    paymentId: "pix-123",
    qrCode: "000201...",
    qrCodeBase64: "base64...",
    ticketUrl: null,
    expiresAt: null,
  }),
  createMercadoPagoCardCheckout: vi.fn().mockResolvedValue({
    id: "pref-123",
    checkoutUrl: "https://mp.com/card",
    sandboxCheckoutUrl: null,
  }),
}));

vi.mock("./checkout-pricing.server", () => ({
  resolveCheckoutPricing: vi.fn().mockResolvedValue({ ok: true, valor: 10, quantidade: 1000 }),
  precoAceito: vi.fn((v) => v),
}));

vi.mock("./route-preflight.server", () => ({
  preflightRouteOrBlock: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("./target-preflight.server", () => ({
  preflightTargetOrBlock: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("./card-pricing", () => ({
  cardAmount: vi.fn((v) => v + 1),
  cardBlockedReason: vi.fn(() => null),
}));

describe("FASE 1 — Contrato de Pagamento", () => {
  const payloadBase = {
    pacote: "p1k",
    quantidade: 1000,
    valor: 10,
    instagram_user: "teste",
  };

  it("TESTE 1 — PIX: deve aceitar e selecionar o fluxo Pix", async () => {
    const { createMercadoPagoPixPayment, createMercadoPagoCardCheckout } = await import("./mercadopago.server");
    
    const res = await criarPedido({ data: { ...payloadBase, metodo: "pix" } });
    
    expect(res.ok).toBe(true);
    expect(res.metodo).toBe("pix");
    expect(createMercadoPagoPixPayment).toHaveBeenCalled();
    expect(createMercadoPagoCardCheckout).not.toHaveBeenCalled();
  });

  it("TESTE 2 — CARTÃO: deve aceitar e selecionar o fluxo Cartão", async () => {
    const { createMercadoPagoPixPayment, createMercadoPagoCardCheckout } = await import("./mercadopago.server");
    
    const res = await criarPedido({ data: { ...payloadBase, metodo: "cartao" } });
    
    expect(res.ok).toBe(true);
    expect(res.metodo).toBe("cartao");
    expect(createMercadoPagoCardCheckout).toHaveBeenCalled();
    expect(createMercadoPagoPixPayment).not.toHaveBeenCalled();
  });

  it("TESTE 3 — AUSENTE: deve ser rejeitado por Zod", async () => {
    await expect(criarPedido({ data: { ...payloadBase } as any })).rejects.toThrow();
  });

  it("TESTE 4 — NULL: deve ser rejeitado por Zod", async () => {
    await expect(criarPedido({ data: { ...payloadBase, metodo: null } as any })).rejects.toThrow();
  });

  it("TESTE 5 — STRING INVÁLIDA: deve ser rejeitado por Zod", async () => {
    await expect(criarPedido({ data: { ...payloadBase, metodo: "credito" } as any })).rejects.toThrow();
  });

  it("TESTE 6 — CASE INCORRETO: deve ser rejeitado por Zod (case sensitive)", async () => {
    await expect(criarPedido({ data: { ...payloadBase, metodo: "PIX" } as any })).rejects.toThrow();
  });
});
