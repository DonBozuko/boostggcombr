import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// v590 — Autoridade única de preço no checkout.
// A regressão que este teste impede: alguém reintroduzir uma tabela de preços
// fixa no código. A tabela antiga estava até 38% abaixo do preço aprovado no
// banco e não continha pacotes reais (p50/p150/p200).

const maybeSingle = vi.fn();
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

const linhaBoa = {
  price_brl: 19,
  quantidade: 500,
  cost_brl: 1.03,
  is_sellable: true,
  sellable_reason: null,
  smmpanel_service_id: "52",
};

describe("v590 — preço do checkout sai só de pricing_items", () => {
  beforeEach(() => maybeSingle.mockReset());

  it("não existe tabela de preço fixa em pedidos.functions.ts", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/pedidos.functions.ts"), "utf8");
    expect(src).not.toContain("PRICE_TABLE");
    // nenhuma constante de preço por pacote sobrando (ex.: p500: { valor: 12 })
    expect(/\bvalor:\s*\d+(\.\d+)?\s*\}/.test(src)).toBe(false);
  });

  it("usa o preço do banco", async () => {
    maybeSingle.mockResolvedValue({ data: linhaBoa, error: null });
    const { resolveCheckoutPricing } = await import("../lib/checkout-pricing.server");
    const r = await resolveCheckoutPricing("p500");
    expect(r).toMatchObject({ ok: true, valor: 19, quantidade: 500 });
  });

  it("falha fechado quando o banco não responde (nunca inventa preço)", async () => {
    maybeSingle.mockRejectedValue(new Error("db fora do ar"));
    const { resolveCheckoutPricing } = await import("../lib/checkout-pricing.server");
    const r = await resolveCheckoutPricing("p500");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("PRICE_UNAVAILABLE");
  });

  it("bloqueia pacote pausado ou sem fornecedor", async () => {
    maybeSingle.mockResolvedValue({
      data: { ...linhaBoa, smmpanel_service_id: null },
      error: null,
    });
    const { resolveCheckoutPricing } = await import("../lib/checkout-pricing.server");
    const r = await resolveCheckoutPricing("p500");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("INVALID_PACKAGE");
  });

  it("drift acima de 1% não derruba o preço do servidor", async () => {
    const { precoAceito } = await import("../lib/checkout-pricing.server");
    expect(precoAceito(19, 12)).toBe(19); // tentativa de pagar o preço velho
    expect(precoAceito(19, 18.9)).toBe(18.9); // oscilação de cache tolerada
  });
});
