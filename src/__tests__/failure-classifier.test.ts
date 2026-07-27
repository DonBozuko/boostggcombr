import { describe, it, expect } from "vitest";
import { classifyDispatchFailure } from "@/lib/failure-classifier";

describe("v296 classificador de falha de entrega", () => {
  it("saldo insuficiente => balance (SLA 24h)", () => {
    expect(classifyDispatchFailure(["SMMPainel: not enough funds"])).toBe("balance");
  });

  it("erro de verificação do painel => transient (retenta, não estorna)", () => {
    expect(
      classifyDispatchFailure([
        "SMMPainel: Unable to verify your domain submission",
        "Verified Atacado: Unable to verify your domain submission",
        "SMMhype: Incorrect service ID",
      ]),
    ).toBe("transient");
  });

  it("link inválido em todos => permanent (estorna na hora)", () => {
    expect(
      classifyDispatchFailure(["SMMPainel: invalid link", "Verified: user not found"]),
    ).toBe("permanent");
  });

  it("um provedor permanente + outro temporário => transient", () => {
    expect(
      classifyDispatchFailure(["SMMPainel: invalid link", "Verified: HTTP 502"]),
    ).toBe("transient");
  });
});
