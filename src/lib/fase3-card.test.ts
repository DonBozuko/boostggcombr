import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMercadoPagoCardCheckout, createMercadoPagoPixPayment } from "./mercadopago.server";

// Mock do fetch global
const globalFetch = vi.fn();
global.fetch = globalFetch;

// Mock do token
vi.mock("./mp-token.server", () => ({
  getMpAccessToken: vi.fn().mockResolvedValue("TEST_TOKEN")
}));

describe("FASE 3 — Cartão e Checkout Pro", () => {
  const mockInput = {
    id: "uuid-pedido-card-123",
    pacote: "v100",
    quantidade: 100,
    valor: 15.00,
    alvo: "user_test",
    email: "card@example.com"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TESTE 1 — CARTÃO VÁLIDO: deve chamar o endpoint de preferência e não o de pix", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: "pref_123",
        init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_123",
        sandbox_init_point: "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_123"
      })
    });

    const result = await createMercadoPagoCardCheckout(mockInput);

    expect(result.checkoutUrl).toBe("https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref_123");
    
    const [url, options] = globalFetch.mock.calls[0];
    expect(url).toContain("/checkout/preferences");
    expect(options.headers["X-Idempotency-Key"]).toBe(`card:${mockInput.id}`);

    // Garantir que o payload exclui Pix (bank_transfer e ticket)
    const body = JSON.parse(options.body);
    expect(body.payment_methods.excluded_payment_types).toContainEqual({ id: "ticket" });
    expect(body.payment_methods.excluded_payment_types).toContainEqual({ id: "bank_transfer" });
  });

  it("TESTE 2 — URL VÁLIDA: deve retornar checkoutUrl presente e não vazia", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        init_point: "https://valid.url"
      })
    });

    const result = await createMercadoPagoCardCheckout(mockInput);
    expect(result.checkoutUrl).toBe("https://valid.url");
  });

  it("TESTE 3 — URL AUSENTE: deve lançar erro quando init_point é undefined", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "123"
        // init_point ausente
      })
    });

    await expect(createMercadoPagoCardCheckout(mockInput)).rejects.toThrow("Mercado Pago não devolveu a URL de checkout do cartão");
  });

  it("TESTE 4 — URL VAZIA: deve lançar erro quando init_point é string vazia", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        init_point: "   "
      })
    });

    await expect(createMercadoPagoCardCheckout(mockInput)).rejects.toThrow("Mercado Pago não devolveu a URL de checkout do cartão");
  });

  it("TESTE 7 — ERRO DO GATEWAY 400: não deve apresentar checkout válido", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Bad Request"
    });

    await expect(createMercadoPagoCardCheckout(mockInput)).rejects.toThrow("Mercado Pago card error (400): Bad Request");
  });

  it("TESTE 7 — ERRO DO GATEWAY 500: deve falhar corretamente", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error"
    });

    await expect(createMercadoPagoCardCheckout(mockInput)).rejects.toThrow("Mercado Pago card error (500): Internal Server Error");
  });

  it("TESTE 7 — TIMEOUT: deve falhar ao exceder tempo limite", async () => {
     // Simulando erro de abort signal
     globalFetch.mockRejectedValueOnce(new Error("Timeout"));
     await expect(createMercadoPagoCardCheckout(mockInput)).rejects.toThrow("Timeout");
  });
});
