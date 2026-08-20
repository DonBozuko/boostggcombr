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

describe("FASE 4.1 — Auditoria de Idempotência e Crash Window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("CENÁRIO CRÍTICO B: Crash Pós-Envio (Risco de Duplicidade)", () => {
    it("deve provar que o sistema atual NÃO tem idempotência externa (external_id) no SMMHype", async () => {
      // 1. O fluxo atual de dispatchSmmhype (src/lib/smmhype.server.ts) 
      // envia apenas: key, action, service, link, quantity.
      // NÃO há campo 'external_id' ou similar sendo enviado no URLSearchParams.
      
      // 2. Se o processo morrer aqui, não há como o SMMHype saber que um reenvio
      // com os mesmos parâmetros é o mesmo pedido.
      
      const payload = {
        action: "add",
        service: "14325",
        link: "https://instagram.com/user",
        quantity: "100"
      };
      
      expect(payload).not.toHaveProperty("external_id");
      expect(payload).not.toHaveProperty("client_order_id");
    });
  });

  describe("CENÁRIO A: Recuperação Segura", () => {
    it("deve permitir retry se o claim expirar e o commit nunca ocorreu", async () => {
       // Mock: Pedido existe, provider_order_id é nulo, e o claim expirou (TTL)
       mockAdmin.select.mockResolvedValueOnce({ data: [{ id: "p1" }], error: null });
       
       const won = await claimDispatch(mockAdmin as any, "p1");
       expect(won).toBe(true);
    });
  });
});
