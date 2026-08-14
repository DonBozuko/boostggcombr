import { describe, it, expect, vi } from 'vitest';

// Mocks para simular ambiente admin
process.env.ADMIN_TOKEN = 'test-token-v636.2';

// Mock do TanStack Start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (handler: any) => {
        const fn = async (args: any) => handler(args);
        return fn;
      }
    })
  })
}));

// Mock do assertAdmin
vi.mock("@/lib/admin-guard.server", () => ({
  assertAdmin: async (token: string) => {
    if (token === 'test-token-v636.2') return { ok: true, email: 'fabiano.majestic@gmail.com' };
    return { ok: false, reason: 'UNAUTHORIZED' };
  }
}));

// Mock do supabaseAdmin com encadeamento manual robusto
const mockChain: any = {};
mockChain.from = vi.fn().mockReturnValue(mockChain);
mockChain.insert = vi.fn().mockReturnValue(mockChain);
mockChain.select = vi.fn().mockReturnValue(mockChain);
mockChain.update = vi.fn().mockReturnValue(mockChain);
mockChain.eq = vi.fn().mockReturnValue(mockChain);
mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: mockChain
}));

import { createIncident, updateIncidentStatus } from './jarvis-incidents.server';

describe('Validação Forense v636.2 - Máquina de Estados e Circuit Breaker', () => {
  const token = 'test-token-v636.2';

  describe('4. Máquina de Estados - Transições Válidas', () => {
    const transitions = [
      { from: 'DETECTED', to: 'INVESTIGATING' },
      { from: 'INVESTIGATING', to: 'ROOT_CAUSE_IDENTIFIED' },
      { from: 'ROOT_CAUSE_IDENTIFIED', to: 'FIX_APPLIED' },
      { from: 'FIX_APPLIED', to: 'VALIDATING' },
      { from: 'VALIDATING', to: 'REGRESSION_VERIFIED' },
      { from: 'REGRESSION_VERIFIED', to: 'CLOSED', extra: { rootCause: 'RC', fixApplied: 'FIX', validationNotes: 'VAL', regressionVerified: true } }
    ];

    transitions.forEach(({ from, to, extra }) => {
      it(`deve permitir transição ${from} -> ${to}`, async () => {
        // Reset e mock do single para a busca do estado atual
        mockChain.single.mockResolvedValueOnce({
          data: { id: 'uuid-1', status: from, root_cause: null, fix_applied: null },
          error: null
        });
        
        // Mock do resultado do update (que também usa .eq().single() no código original ou apenas .eq())
        // No server, updateIncidentStatus usa .update().eq() que retorna Promise<{error}>
        mockChain.eq.mockResolvedValueOnce({ error: null });

        // @ts-ignore
        const res = await updateIncidentStatus({ 
          data: { token, incidentId: 'uuid-1', newStatus: to, ...(extra || {}) } 
        });
        
        expect(res.ok).toBe(true);
      });
    });
  });

  describe('4. Máquina de Estados - Transições Inválidas', () => {
    it('deve bloquear transição proibida DETECTED -> FIX_APPLIED', async () => {
      mockChain.single.mockResolvedValueOnce({
        data: { id: 'uuid-1', status: 'DETECTED' },
        error: null
      });

      // @ts-ignore
      const res = await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'FIX_APPLIED' } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain('INVALID_TRANSITION');
    });
  });

  describe('7. Circuit Breaker', () => {
    it('falha fatal no banco deve ativar circuit breaker', async () => {
      mockChain.from.mockImplementationOnce(() => {
        throw new Error("DB_CRASH");
      });

      // @ts-ignore
      const res = await createIncident({ 
        data: { token, type: 'TEST', headline: 'Test', severity: 'info', origin: 'test' } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe('CIRCUIT_BREAKER_ACTIVE');
    });
  });
});
