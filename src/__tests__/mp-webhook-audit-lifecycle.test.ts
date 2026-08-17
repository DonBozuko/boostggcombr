import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const SRC = readFileSync("src/routes/api/public/mp-webhook.ts", "utf8");

describe("webhook Mercado Pago — telemetria do ciclo real", () => {
  it("carimba o resultado dentro do finally do job assíncrono", () => {
    const jobStart = SRC.indexOf("const job = (async () => {");
    const finallyBlock = SRC.indexOf("} finally {", jobStart);
    const processedStamp = SRC.indexOf("processed_at: new Date().toISOString()", finallyBlock);
    const schedule = SRC.indexOf("scheduleWebhookBackground(job(), context)", jobStart);

    expect(jobStart).toBeGreaterThan(-1);
    expect(finallyBlock).toBeGreaterThan(jobStart);
    expect(processedStamp).toBeGreaterThan(finallyBlock);
    expect(processedStamp).toBeLessThan(schedule);
  });

  it("vincula o evento ao pedido encontrado", () => {
    expect(SRC).toContain("auditPedidoId = String(pedido.id)");
    expect(SRC).toContain("pedido_id: auditPedidoId");
  });
});