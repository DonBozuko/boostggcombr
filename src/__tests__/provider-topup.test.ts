import { describe, it, expect } from "vitest";
import { buildTopupUrl, buildTopupKeyboard } from "@/lib/provider-topup";

describe("v298 botão de recarga no alerta de saldo", () => {
  it("deriva a página de recarga do api_url real", () => {
    expect(buildTopupUrl("https://smmhype.com/api/v2")).toBe("https://smmhype.com/addfunds");
    expect(buildTopupUrl("https://smmoficial.com/api/v2/")).toBe("https://smmoficial.com/addfunds");
  });

  it("api_url ausente ou quebrado não vira botão quebrado", () => {
    expect(buildTopupUrl(null)).toBeNull();
    expect(buildTopupUrl("nao-e-url")).toBeNull();
  });

  it("um botão por fornecedor, com saldo no rótulo", () => {
    const kb = buildTopupKeyboard([
      { nome: "SMMPainel", api_url: "https://smmpainel.com/api/v2", saldoBrl: 8.5 },
      { nome: "Sem URL", api_url: null, saldoBrl: 1 },
    ]);
    expect(kb).toHaveLength(1);
    expect(kb[0][0].text).toBe("💳 Recarregar SMMPainel (R$ 8.50)");
    expect(kb[0][0].url).toBe("https://smmpainel.com/addfunds");
  });
});
