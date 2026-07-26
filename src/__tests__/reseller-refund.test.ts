import { describe, it, expect, vi } from "vitest";
import { isResellerPaid, refundPedido } from "@/lib/reseller-refund.server";

describe("v279 — estorno por origem do pagamento", () => {
  it("reconhece pedido de revenda (saldo pré-pago, sem cobrança no MP)", () => {
    expect(isResellerPaid({ reseller_id: "r1", mercado_pago_id: null })).toBe(true);
    expect(isResellerPaid({ reseller_id: "r1", mercado_pago_id: "" })).toBe(true);
    expect(isResellerPaid({ reseller_id: "r1", mercado_pago_id: "12345" })).toBe(false);
    expect(isResellerPaid({ reseller_id: null, mercado_pago_id: null })).toBe(false);
  });

  it("nunca chama o Mercado Pago quando não há pagamento rastreável", async () => {
    const mpSpy = vi.fn();
    vi.doMock("@/lib/dispatcher-fallback.server", () => ({ refundMercadoPago: mpSpy }));
    const r = await refundPedido({ id: "p1", reseller_id: null, mercado_pago_id: null }, "teste");
    expect(r.ok).toBe(false);
    expect(r.kind).toBe("none");
    expect(mpSpy).not.toHaveBeenCalled();
  });
});

describe("v279 — chave de idempotência da API de revenda", () => {
  // Mesma regra aplicada em actionAdd: revendedor + pacote + link + janela de 90s.
  const build = (resellerId: string, pacote: string, link: string, nowMs: number) =>
    `rs:${resellerId}:${pacote}:${link.toLowerCase()}:${Math.floor(nowMs / 90_000)}`;

  it("requisição repetida na mesma janela gera a MESMA chave (bloqueia cobrança dupla)", () => {
    const t = 1_700_000_000_000;
    expect(build("r1", "br-1k", "@Fabiano", t)).toBe(build("r1", "br-1k", "@fabiano", t + 2000));
  });

  it("pedidos legítimos diferentes geram chaves diferentes", () => {
    const t = 1_700_000_000_000;
    expect(build("r1", "br-1k", "@a", t)).not.toBe(build("r1", "br-1k", "@b", t));
    expect(build("r1", "br-1k", "@a", t)).not.toBe(build("r2", "br-1k", "@a", t));
    expect(build("r1", "br-1k", "@a", t)).not.toBe(build("r1", "br-1k", "@a", t + 120_000));
  });
});
