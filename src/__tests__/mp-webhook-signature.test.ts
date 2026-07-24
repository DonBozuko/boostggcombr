import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyMpSignature } from "@/lib/mp-signature";

const SECRET = "segredo-de-teste";

function signedHeader(dataId: string, reqId: string, ts = "1700000000") {
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const v1 = createHmac("sha256", SECRET).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

// FLUXO 3 — Webhook de pagamento. Se isto quebrar, ou o Pix para de cair,
// ou qualquer um consegue forjar um pagamento aprovado.
describe("assinatura do webhook Mercado Pago", () => {
  it("aceita assinatura legítima", () => {
    expect(
      verifyMpSignature({
        signatureHeader: signedHeader("123", "abc"),
        requestIdHeader: "abc",
        dataId: "123",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rejeita assinatura forjada", () => {
    expect(
      verifyMpSignature({
        signatureHeader: "ts=1700000000,v1=" + "f".repeat(64),
        requestIdHeader: "abc",
        dataId: "123",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejeita se o payment id não confere (replay em outro pedido)", () => {
    expect(
      verifyMpSignature({
        signatureHeader: signedHeader("123", "abc"),
        requestIdHeader: "abc",
        dataId: "999",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rejeita header ausente, malformado ou sem segredo", () => {
    const base = { requestIdHeader: "abc", dataId: "123", secret: SECRET };
    expect(verifyMpSignature({ ...base, signatureHeader: null })).toBe(false);
    expect(verifyMpSignature({ ...base, signatureHeader: "lixo" })).toBe(false);
    expect(verifyMpSignature({ ...base, signatureHeader: signedHeader("123", "abc"), secret: "" })).toBe(false);
    expect(
      verifyMpSignature({ ...base, dataId: null, signatureHeader: signedHeader("123", "abc") }),
    ).toBe(false);
  });
});
