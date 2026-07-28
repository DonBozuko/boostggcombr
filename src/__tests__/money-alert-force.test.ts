import { describe, it, expect } from "vitest";
import { classifyAlertSeverity } from "@/lib/alert-severity";
import { buildUniversalPaidMessage } from "@/lib/whatsapp-admin.server";

// v318 — regressão real: o texto de venda paga é classificado como "info"
// (🟢 / "entrega automática") e o portão de severidade suprimia o Telegram.
// Dinheiro entrando NUNCA pode depender do classificador: o envio usa force.
describe("alerta de dinheiro entrando", () => {
  it("texto de venda paga é lido como info (por isso precisa de force)", () => {
    const msg = buildUniversalPaidMessage({
      pedidoId: "abc", vendaBrl: 30, custoBrl: 3,
      compradorHandle: "@x", pacote: "ig_seguidores_1k", quantidade: 1000,
    });
    expect(classifyAlertSeverity(msg)).toBe("info");
  });

  it("recarga de revendedor aprovada também é info", () => {
    expect(classifyAlertSeverity("💰 RECARGA DE REVENDEDOR APROVADA\n\nPROBLEMA: nenhum — entrou dinheiro.")).toBe("info");
  });
});
