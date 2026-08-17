import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/lib/payment-contingency.server.ts", "utf8");

describe("v446 — atomicidade do despacho por contingência", () => {
  it("reivindica o pedido antes de chamar o fornecedor", () => {
    const claim = SRC.indexOf("await claimDispatch(");
    const dispatch = SRC.indexOf("await dispatchByFornecedor(", claim);
    expect(claim).toBeGreaterThan(-1);
    expect(dispatch).toBeGreaterThan(claim);
  });

  it("usa a autoridade atômica para concluir o despacho", () => {
    expect(SRC).toContain("await commitDispatch(");
    expect(SRC).not.toMatch(/\.update\(\{\s*status:\s*"processing"[\s\S]{0,500}\.is\("provider_order_id", null\)/);
  });

  it("libera a reserva quando nenhum fornecedor conclui", () => {
    expect(SRC).toContain("if (!sucesso) await releaseDispatch(");
  });

  it("não acusa webhook morto quando o evento já foi recebido", () => {
    expect(SRC).toContain('.from("webhook_events" as any)');
    expect(SRC).toContain("isFirstProcessing && !webhookWasReceived");
    expect(SRC).toContain("webhook_received: webhookWasReceived");
  });
});