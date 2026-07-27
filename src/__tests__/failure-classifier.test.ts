import { describe, it, expect } from "vitest";
import { classifyDispatchFailure, resolveSlaDeadline } from "@/lib/failure-classifier";

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

describe("v296 prazo do parqueamento", () => {
  it("primeira vez: cria prazo de 2h para falha temporária", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(resolveSlaDeadline(null, "transient", now)).toBe(new Date(now + 7200_000).toISOString());
  });

  it("primeira vez: cria prazo de 24h para saldo", () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    expect(resolveSlaDeadline(undefined, "balance", now)).toBe(new Date(now + 86400_000).toISOString());
  });

  it("retentativa NÃO empurra o vencimento (anti prazo eterno)", () => {
    const first = new Date(Date.UTC(2026, 0, 1, 14, 0, 0)).toISOString();
    const later = Date.UTC(2026, 0, 1, 13, 45, 0);
    expect(resolveSlaDeadline(first, "transient", later)).toBe(first);
  });
});
