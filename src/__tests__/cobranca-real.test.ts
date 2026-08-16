import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * v643 — Contrato de cobrança real.
 *
 * Bug que originou estes testes: o checkout devolvia a URL do Checkout Pro
 * como se fosse código Pix (copia e cola inválido, QR vazio) e o cartão nunca
 * recebia `checkoutUrl`. Aqui travamos o contrato contra o Mercado Pago.
 */

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {} as any,
}));

vi.mock("../lib/mp-token.server", () => ({
  getMpAccessToken: async () => "token-de-teste",
}));

import {
  createMercadoPagoPixPayment,
  createMercadoPagoCardCheckout,
} from "../lib/mercadopago.server";

const entrada = {
  id: "11111111-2222-3333-4444-555555555555",
  pacote: "p1k",
  quantidade: 1000,
  valor: 23.47,
  alvo: "cliente",
  email: "cliente@exemplo.com",
};

function mockFetch(status: number, payload: unknown) {
  const spy = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }));
  vi.stubGlobal("fetch", spy as unknown as typeof fetch);
  return spy;
}

const PIX_OK = {
  id: 987654321,
  date_of_expiration: "2026-08-16T22:00:00.000-03:00",
  point_of_interaction: {
    transaction_data: {
      qr_code: "00020126580014BR.GOV.BCB.PIX0136chave5204000053039865802BR6304ABCD",
      qr_code_base64: "iVBORw0KGgoAAAANS",
      ticket_url: "https://www.mercadopago.com.br/payments/987654321/ticket",
    },
  },
};

beforeEach(() => vi.restoreAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("Pix real", () => {
  it("chama o endpoint de pagamento, não o de preferência", async () => {
    const spy = mockFetch(201, PIX_OK);
    await createMercadoPagoPixPayment(entrada);
    const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(JSON.parse(String(init.body)).payment_method_id).toBe("pix");
  });

  it("devolve copia-e-cola válido e QR não vazio", async () => {
    mockFetch(201, PIX_OK);
    const pix = await createMercadoPagoPixPayment(entrada);
    expect(pix.qrCode.startsWith("000201")).toBe(true);
    expect(pix.qrCode.startsWith("http")).toBe(false);
    expect(pix.qrCodeBase64.length).toBeGreaterThan(0);
    expect(pix.paymentId).toBe("987654321");
  });

  it("recusa quando o Mercado Pago não devolve o código Pix", async () => {
    mockFetch(201, { id: 1, point_of_interaction: { transaction_data: {} } });
    await expect(createMercadoPagoPixPayment(entrada)).rejects.toThrow(/qr_code/);
  });

  it("usa chave de idempotência e referência do pedido", async () => {
    const spy = mockFetch(201, PIX_OK);
    await createMercadoPagoPixPayment(entrada);
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toBe(`pix:${entrada.id}`);
    expect(JSON.parse(String(init.body)).external_reference).toBe(`pedido:${entrada.id}`);
  });

  it("falha alto quando o gateway responde erro", async () => {
    mockFetch(400, { message: "invalid" });
    await expect(createMercadoPagoPixPayment(entrada)).rejects.toThrow(/Mercado Pago Pix error/);
  });
});

describe("Cartão real", () => {
  it("devolve URL de checkout utilizável", async () => {
    mockFetch(201, { id: "pref-1", init_point: "https://mp.com/checkout/pref-1" });
    const card = await createMercadoPagoCardCheckout(entrada);
    expect(card.checkoutUrl).toBe("https://mp.com/checkout/pref-1");
  });

  it("exclui Pix e boleto do fluxo de cartão", async () => {
    const spy = mockFetch(201, { id: "pref-1", init_point: "https://mp.com/x" });
    await createMercadoPagoCardCheckout(entrada);
    const [, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    const tipos = body.payment_methods.excluded_payment_types.map((t: any) => t.id);
    expect(tipos).toContain("bank_transfer");
    expect(tipos).toContain("ticket");
    expect(body.external_reference).toBe(`pedido:${entrada.id}`);
  });

  it("recusa quando não vem URL de checkout", async () => {
    mockFetch(201, { id: "pref-1", init_point: "" });
    await expect(createMercadoPagoCardCheckout(entrada)).rejects.toThrow(/URL de checkout/);
  });
});
