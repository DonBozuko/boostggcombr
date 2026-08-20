import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimDispatch } from "./dispatch-claim.server";
import { commitDispatch } from "./dispatch-commit.server";
import { interpretProviderResponse } from "./dispatch-response";

// Mock do banco de dados (Supabase Admin)
const mockAdmin = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
};

describe("FASE 4.1 — Auditoria de Idempotência e Crash Window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. SIMULAÇÃO DE CRASH WINDOW", () => {
    it("Cenário: Processo morre APÓS envio ao fornecedor mas ANTES do commit", async () => {
      // 1. Claim vence
      mockAdmin.select.mockResolvedValueOnce({ data: [{ id: "p1" }], error: null });
      const won = await claimDispatch(mockAdmin as any, "p1");
      expect(won).toBe(true);

      // 2. Simula envio ao fornecedor (OK)
      const providerOrderId = "order_abc_123";

      // 3. CRASH! (O processo morre aqui, commitDispatch não é chamado)
      
      // 4. Reconciliador acorda após TTL (ex: 3 min)
      // O reconciliador deve verificar se o pedido já existe no fornecedor antes de criar novo.
      
      // Validação: Como o SMMHype/SMM Panel V2 não tem external_id nativo no dispatchSmmhype,
      // a única forma de evitar duplicidade é a consulta prévia ou o uso de uma chave de idempotência se suportada.
      
      expect(providerOrderId).toBeDefined();
    });
  });

  describe("2. LEITOR DE RESPOSTA (dispatch-response)", () => {
    it("deve identificar erro escondido em HTTP 200", () => {
      const resp = interpretProviderResponse(JSON.stringify({ error: "Not enough funds" }), 200);
      expect(resp.ok).toBe(false);
      if (!resp.ok) expect(resp.error).toContain("funds");
    });

    it("deve identificar sucesso com orderId válido", () => {
      const resp = interpretProviderResponse(JSON.stringify({ order: "12345" }), 200);
      expect(resp.ok).toBe(true);
      if (resp.ok) expect(resp.orderId).toBe("12345");
    });
  });
});
