import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMercadoPagoPixPayment } from "./mercadopago.server";

// Mock do fetch global
const globalFetch = vi.fn();
global.fetch = globalFetch;

// Mock do token
vi.mock("./mp-token.server", () => ({
  getMpAccessToken: vi.fn().mockResolvedValue("TEST_TOKEN")
}));

describe("FASE 2 — Contrato e Validação PIX", () => {
  const mockInput = {
    id: "uuid-pedido-123",
    pacote: "v100",
    quantidade: 100,
    valor: 10.50,
    alvo: "user_test",
    email: "test@example.com"
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TESTE DE CONTRATO: deve mapear resposta válida do Mercado Pago", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: "123456789",
        status: "pending",
        point_of_interaction: {
          transaction_data: {
            qr_code: "000201...",
            qr_code_base64: "base64data",
            ticket_url: "https://ticket.url"
          }
        }
      })
    });

    const result = await createMercadoPagoPixPayment(mockInput);

    expect(result).toEqual({
      paymentId: "123456789",
      status: "pending",
      qrCode: "000201...",
      qrCodeBase64: "base64data",
      ticketUrl: "https://ticket.url",
      expiresAt: null
    });

    // Verificar headers e idempotência
    const [url, options] = globalFetch.mock.calls[0];
    expect(url).toContain("/v1/payments");
    expect(options.headers["X-Idempotency-Key"]).toBe(`pix:${mockInput.id}`);
  });

  it("TESTE QR_CODE VAZIO: deve lançar erro", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "123",
        point_of_interaction: { transaction_data: { qr_code: "", qr_code_base64: "valid" } }
      })
    });

    await expect(createMercadoPagoPixPayment(mockInput)).rejects.toThrow("Mercado Pago respondeu sem código Pix (qr_code)");
  });

  it("TESTE QR_BASE64 VAZIO: deve lançar erro", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "123",
        point_of_interaction: { transaction_data: { qr_code: "valid", qr_code_base64: "" } }
      })
    });

    await expect(createMercadoPagoPixPayment(mockInput)).rejects.toThrow("Mercado Pago respondeu sem QR Code Base64");
  });

  it("TESTE SEM PAYMENT_ID: deve lançar erro", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        point_of_interaction: { transaction_data: { qr_code: "valid", qr_code_base64: "valid" } }
      })
    });

    await expect(createMercadoPagoPixPayment(mockInput)).rejects.toThrow("Mercado Pago respondeu sem ID de pagamento");
  });

  it("TESTE DE INIT_POINT: deve impedir uso de init_point como Pix (Anti-Regressão)", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "123",
        init_point: "https://link-checkout-pro",
        point_of_interaction: { 
          transaction_data: { 
            qr_code: "https://link-checkout-pro", // MENTIRA: URL no lugar de Pix
            qr_code_base64: "base64" 
          } 
        }
      })
    });

    await expect(createMercadoPagoPixPayment(mockInput)).rejects.toThrow("Falha Crítica: Gateway retornou init_point no lugar do Pix real");
  });

  it("TESTE ERROS GATEWAY: deve repassar erro de status HTTP", async () => {
    globalFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => "Invalid transaction amount"
    });

    await expect(createMercadoPagoPixPayment(mockInput)).rejects.toThrow("Mercado Pago Pix error (400): Invalid transaction amount");
  });

  it("TESTE IDEMPOTÊNCIA: deve manter a mesma chave para o mesmo pedido", async () => {
    // Esse teste é implícito na lógica de construção da chave
    // Mas vamos garantir que o prefixo 'pix:' é usado
    globalFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "1", point_of_interaction: { transaction_data: { qr_code: "q", qr_code_base64: "b" } } })
    });

    await createMercadoPagoPixPayment(mockInput);
    const firstKey = globalFetch.mock.calls[0][1].headers["X-Idempotency-Key"];
    
    await createMercadoPagoPixPayment(mockInput);
    const secondKey = globalFetch.mock.calls[1][1].headers["X-Idempotency-Key"];

    expect(firstKey).toBe(`pix:${mockInput.id}`);
    expect(secondKey).toBe(firstKey);
  });
});
