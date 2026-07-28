import { describe, it, expect } from "vitest";
import { classifyAlertSeverity } from "@/lib/alert-severity";

describe("v316 — severidade do alerta é derivada, não herdada", () => {
  it("sucesso nunca vira vermelho", () => {
    expect(classifyAlertSeverity("✅ PACOTE VOLTOU AO NORMAL\n\nPROBLEMA: nenhum.")).toBe("info");
    expect(classifyAlertSeverity("🟢 PIX APROVADO\n\nPedido entregue.")).toBe("info");
    expect(classifyAlertSeverity("🤝 NOVO PEDIDO DE REVENDA")).toBe("info");
  });

  it("trava que funcionou é aviso, não vermelho", () => {
    expect(
      classifyAlertSeverity("⚠️ MUDANÇA DE PREÇO EM MASSA BLOQUEADA\n\nPROBLEMA: 192 de 281 pacotes mudariam."),
    ).toBe("warning");
    expect(classifyAlertSeverity("⚠️ PACOTE TIRADO DA VITRINE por margem baixa")).toBe("warning");
  });

  it("dinheiro ou cliente em risco continua vermelho", () => {
    expect(classifyAlertSeverity("🚨 ENTREGA REAL QUEBRADA\n\nPROBLEMA: canário não entregou.")).toBe("critical");
    expect(classifyAlertSeverity("⛔ COBRANÇA ÓRFÃ detectada, estorno enviado")).toBe("critical");
  });

  // v345 — saldo tem prazo de entrega (24h). Dentro do prazo é amarelo;
  // só vira vermelho quando o prazo estoura.
  it("saldo dentro do prazo é amarelo, saldo vencido é vermelho", () => {
    expect(classifyAlertSeverity("⚠️ SALDO BAIXO NO FORNECEDOR\n\nO QUE FAZER: recarregar.")).toBe("warning");
    expect(
      classifyAlertSeverity("Saldo pendente há mais de 24h — SMMPainel: recarregar R$ 22,20"),
    ).toBe("critical");
  });


  it("mensagem desconhecida não acorda o dono por acidente", () => {
    expect(classifyAlertSeverity("relatório diário gerado")).toBe("warning");
    expect(classifyAlertSeverity("")).toBe("warning");
  });

  it("sucesso vence marcador crítico que aparece só no corpo do texto", () => {
    expect(
      classifyAlertSeverity("✅ RECARGA CONFIRMADA\n\nO alerta de saldo baixo foi resolvido."),
    ).toBe("info");
  });
});
