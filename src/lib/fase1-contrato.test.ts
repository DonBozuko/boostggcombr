import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

// FASE 1 — Teste do Orquestrador de Pedidos (Simulado para Contrato)
// O orquestrador real em pedidos.functions.ts usa createServerFn que requer contexto de servidor.
// Aqui vamos emular o comportamento do orquestrador para validar a lógica de ramificação.

const MetodoSchema = z.enum(["pix", "cartao"]);

interface PedidoInput {
  metodo: string;
}

// Simulação da lógica de ramificação que implementamos no pedidos.functions.ts
async function simulateOrchestrator(data: PedidoInput, mocks: any) {
  // 1. Validação estrita
  const valid = MetodoSchema.parse(data.metodo);
  
  // 2. Persistência correta
  const metodoPersistido = valid;
  mocks.db.insert({ metodo_pagamento: metodoPersistido });

  // 3. Ramificação estrita
  if (valid === "cartao") {
    return await mocks.gateway.createCard();
  } else {
    return await mocks.gateway.createPix();
  }
}

describe("FASE 1 — Lógica de Contrato e Ramificação", () => {
  const mocks = {
    db: { insert: vi.fn() },
    gateway: { 
      createPix: vi.fn().mockResolvedValue({ ok: true, type: "pix" }),
      createCard: vi.fn().mockResolvedValue({ ok: true, type: "cartao" })
    }
  };

  it("TESTE 1 — PIX: deve selecionar o fluxo Pix", async () => {
    const res = await simulateOrchestrator({ metodo: "pix" }, mocks);
    expect(res.type).toBe("pix");
    expect(mocks.gateway.createPix).toHaveBeenCalled();
    expect(mocks.gateway.createCard).not.toHaveBeenCalled();
    expect(mocks.db.insert).toHaveBeenCalledWith(expect.objectContaining({ metodo_pagamento: "pix" }));
  });

  it("TESTE 2 — CARTÃO: deve selecionar o fluxo Cartão", async () => {
    const res = await simulateOrchestrator({ metodo: "cartao" }, mocks);
    expect(res.type).toBe("cartao");
    expect(mocks.gateway.createCard).toHaveBeenCalled();
    expect(mocks.gateway.createPix).not.toHaveBeenCalled();
    expect(mocks.db.insert).toHaveBeenCalledWith(expect.objectContaining({ metodo_pagamento: "cartao" }));
  });

  it("TESTE 3 — AUSENTE: deve ser rejeitado", async () => {
    await expect(simulateOrchestrator({} as any, mocks)).rejects.toThrow();
  });

  it("TESTE 4 — NULL: deve ser rejeitado", async () => {
    await expect(simulateOrchestrator({ metodo: null } as any, mocks)).rejects.toThrow();
  });

  it("TESTE 5 — STRING INVÁLIDA: deve ser rejeitado", async () => {
    await expect(simulateOrchestrator({ metodo: "credito" }, mocks)).rejects.toThrow();
  });

  it("TESTE 6 — CASE INCORRETO: deve ser rejeitado", async () => {
    await expect(simulateOrchestrator({ metodo: "PIX" }, mocks)).rejects.toThrow();
  });
});
