import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimDispatch, releaseDispatch } from "./dispatch-claim.server";
import { commitDispatch } from "./dispatch-commit.server";

// Mock do banco de dados (Supabase Admin)
const mockAdmin = {
  from: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
};

describe("FASE 4 — Atocimidade e Idempotência (Garantia de Entrega Única)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. CLAIM (Reserva de Envio)", () => {
    it("deve vencer a corrida quando provider_order_id é nulo e não há claim ativo", async () => {
      mockAdmin.select.mockResolvedValueOnce({ data: [{ id: "p1" }], error: null });
      
      const won = await claimDispatch(mockAdmin as any, "p1");
      
      expect(won).toBe(true);
      expect(mockAdmin.update).toHaveBeenCalledWith(expect.objectContaining({
        dispatch_claimed_at: expect.any(String)
      }));
      // A trava deve ser: provider_order_id é nulo E (claimed_at é nulo OU expirou)
      expect(mockAdmin.is).toHaveBeenCalledWith("provider_order_id", null);
    });

    it("deve perder a corrida quando outro processo já atualizou a linha (select vazio)", async () => {
      mockAdmin.select.mockResolvedValueOnce({ data: [], error: null });
      
      const won = await claimDispatch(mockAdmin as any, "p1");
      
      expect(won).toBe(false);
    });

    it("deve falhar de forma segura (fail-closed) em erro de banco", async () => {
      mockAdmin.select.mockResolvedValueOnce({ data: null, error: { message: "db error" } });
      
      const won = await claimDispatch(mockAdmin as any, "p1");
      
      expect(won).toBe(false);
    });
  });

  describe("2. COMMIT (Confirmação de Ciclo)", () => {
    it("deve confirmar o despacho apenas se provider_order_id ainda for nulo", async () => {
      mockAdmin.select.mockResolvedValueOnce({ data: [{ id: "p1" }], error: null });
      
      const committed = await commitDispatch(mockAdmin as any, "p1", {
        status: "processing",
        provider_slug: "smmhype",
        provider_order_id: "order_123",
        custo_real: 1.50
      });
      
      expect(committed).toBe(true);
      expect(mockAdmin.is).toHaveBeenCalledWith("provider_order_id", null);
    });

    it("deve recusar o commit se outro processo (contingência) venceu a corrida e já gravou o ID", async () => {
      mockAdmin.select.mockResolvedValueOnce({ data: [], error: null });
      
      const committed = await commitDispatch(mockAdmin as any, "p1", {
        status: "processing",
        provider_slug: "smmhype",
        provider_order_id: "order_123"
      });
      
      expect(committed).toBe(false);
    });
  });

  describe("3. SIMULAÇÃO DE CONCORRÊNCIA (Webhook vs Contingência)", () => {
    it("Cenário: Ambos tentam claim ao mesmo tempo", async () => {
      // Simula o comportamento do Postgres onde apenas o primeiro UPDATE retorna a linha
      // Webhook tenta
      mockAdmin.select.mockResolvedValueOnce({ data: [{ id: "p1" }], error: null });
      const webhookWon = await claimDispatch(mockAdmin as any, "p1");
      
      // Contingência tenta logo depois (ou no mesmo microssegundo)
      mockAdmin.select.mockResolvedValueOnce({ data: [], error: null });
      const contingencyWon = await claimDispatch(mockAdmin as any, "p1");
      
      expect(webhookWon).toBe(true);
      expect(contingencyWon).toBe(false);
    });
  });
});
