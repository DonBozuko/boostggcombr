import { describe, it, expect, vi, beforeEach } from "vitest";
import { claimDispatch } from "./dispatch-claim.server";
import { commitDispatch } from "./dispatch-commit.server";
import { dispatchSmmhype } from "./smmhype.server";

// Mock global fetch
global.fetch = vi.fn();

describe("FASE 4.1 — Eliminação de Janela de Risco (Exatamente Uma Entrega)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. IDEMPOTÊNCIA EXTERNA (Payload)", () => {
    it("deve incluir 'external_id' no payload para o fornecedor quando o pedidoId existe", async () => {
      process.env.SMMHYPE_API_KEY = "test_key";
      (fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ order: "123456" }),
      });

      const result = await dispatchSmmhype({
        pacote: "p100",
        quantidade: 100,
        instagram_user: "user",
        pedidoId: "boostgg-test-uuid-001"
      });
      
      const calls = (fetch as any).mock.calls;
      console.log("All calls details:", JSON.stringify(calls.map(c => ({ url: c[0], method: c[1]?.method })), null, 2));
      
      const addCall = calls.find(c => c[0] === "https://smmhype.com/api/v2" && c[1]?.method === "POST");
      const bodyStr = addCall ? addCall[1].body : "";
      const body = new URLSearchParams(bodyStr);
      expect(body.get("external_id")).toBe("boostgg-test-uuid-001");
    });
  });

  describe("2. MÁQUINA DE ESTADOS (Diferenciação)", () => {
    it("deve garantir que o commit só ocorre se o pedido ainda não tiver provider_order_id", async () => {
      const mockAdmin = {
        from: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
      };
      
      // Simula que outro processo já gravou (data vazia no select)
      mockAdmin.select.mockResolvedValueOnce({ data: [], error: null });

      const committed = await commitDispatch(mockAdmin as any, "p1", {
        status: "processing",
        provider_slug: "smmhype",
        provider_order_id: "12345"
      });

      expect(committed).toBe(false);
    });
  });
});
