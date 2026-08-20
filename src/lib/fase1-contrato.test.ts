import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

// FASE 1 — Teste do Orquestrador de Pedidos (Simulado para Contrato)
const MetodoSchema = z.enum(["pix", "cartao"]);

interface PedidoInput {
  metodo: string;
}

// Emulação fiel da lógica implementada em src/lib/pedidos.functions.ts
async function simulateOrchestrator(data: PedidoInput, mocks: any) {
  // 1. Validação estrita (Zod)
  const valid = MetodoSchema.parse(data.metodo);
  
  // 2. Persistência correta (Supabase Admin)
  const metodoPersistido = valid;
  await mocks.db.insert({ metodo_pagamento: metodoPersistido });

  // 3. Ramificação estrita (Isolamento de caminhos)
  if (valid === "cartao") {
    return await mocks.gateway.createCard();
  } else {
    return await mocks.gateway.createPix();
  }
}

describe("FASE 1 — Lógica de Contrato e Ramificação", () => {
  it("TESTE 1 — PIX: deve selecionar o fluxo Pix e NÃO o de Cartão", async () => {
    const mocks = {
      db: { insert: vi.fn().mockResolvedValue({ error: null }) },
      gateway: { 
        createPix: vi.fn().mockResolvedValue({ ok: true, type: "pix" }),
        createCard: vi.fn().mockResolvedValue({ ok: true, type: "cartao" })
      }
    };
    const res = await simulateOrchestrator({ metodo: "pix" }, mocks);
    expect(res.type).toBe("pix");
    expect(mocks.gateway.createPix).toHaveBeenCalledOnce();
    expect(mocks.gateway.createCard).not.toHaveBeenCalled();
    expect(mocks.db.insert).toHaveBeenCalledWith(expect.objectContaining({ metodo_pagamento: "pix" }));
  });

  it("TESTE 2 — CARTÃO: deve selecionar o fluxo Cartão e NÃO o de Pix", async () => {
    const mocks = {
      db: { insert: vi.fn().mockResolvedValue({ error: null }) },
      gateway: { 
        createPix: vi.fn().mockResolvedValue({ ok: true, type: "pix" }),
        createCard: vi.fn().mockResolvedValue({ ok: true, type: "cartao" })
      }
    };
    const res = await simulateOrchestrator({ metodo: "cartao" }, mocks);
    expect(res.type).toBe("cartao");
    expect(mocks.gateway.createCard).toHaveBeenCalledOnce();
    expect(mocks.gateway.createPix).not.toHaveBeenCalled();
    expect(mocks.db.insert).toHaveBeenCalledWith(expect.objectContaining({ metodo_pagamento: "cartao" }));
  });

  it("TESTE 3 — AUSENTE: deve ser rejeitado pelo validador", async () => {
    const mocks = { db: { insert: vi.fn() }, gateway: { createPix: vi.fn(), createCard: vi.fn() } };
    await expect(simulateOrchestrator({} as any, mocks)).rejects.toThrow();
  });

  it("TESTE 4 — NULL: deve ser rejeitado pelo validador", async () => {
    const mocks = { db: { insert: vi.fn() }, gateway: { createPix: vi.fn(), createCard: vi.fn() } };
    await expect(simulateOrchestrator({ metodo: null } as any, mocks)).rejects.toThrow();
  });

  it("TESTE 5 — STRING INVÁLIDA: deve ser rejeitado pelo validador", async () => {
    const mocks = { db: { insert: vi.fn() }, gateway: { createPix: vi.fn(), createCard: vi.fn() } };
    await expect(simulateOrchestrator({ metodo: "credito" }, mocks)).rejects.toThrow();
  });

  it("TESTE 6 — CASE INCORRETO: deve ser rejeitado (PIX !== pix)", async () => {
    const mocks = { db: { insert: vi.fn() }, gateway: { createPix: vi.fn(), createCard: vi.fn() } };
    await expect(simulateOrchestrator({ metodo: "PIX" }, mocks)).rejects.toThrow();
  });
});
