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

// Mock do supabaseAdmin com encadeamento completo e flexível
const mockQueryBuilder: any = {
  insert: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
};

// Garantir que todos os métodos retornem o builder para suportar chamadas encadeadas
mockQueryBuilder.insert.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue(mockQueryBuilder),
  }
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
        // Mock da busca do estado atual
        mockQueryBuilder.single.mockResolvedValueOnce({
          data: { id: 'uuid-1', status: from, root_cause: null, fix_applied: null },
          error: null
        });
        
        // Mock do resultado do update
        mockQueryBuilder.eq.mockResolvedValueOnce({ error: null });

        // @ts-ignore
        const res = await updateIncidentStatus({ 
          data: { token, incidentId: 'uuid-1', newStatus: to, ...(extra || {}) } 
        });
        
        if (!res.ok) console.error('Falha na transição:', from, '->', to, res.error);
        expect(res.ok).toBe(true);
      });
    });
  });

  describe('4. Máquina de Estados - Transições Inválidas', () => {
    it('deve bloquear transição proibida DETECTED -> FIX_APPLIED', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
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

    it('deve bloquear transição DETECTED -> CLOSED sem dados (conforme regra 3)', async () => {
        // A máquina de estados permite DETECTED -> CLOSED, mas o validador de encerramento exige dados
        mockQueryBuilder.single.mockResolvedValueOnce({
          data: { id: 'uuid-1', status: 'DETECTED' },
          error: null
        });
  
        // @ts-ignore
        const res = await updateIncidentStatus({ 
          data: { token, incidentId: 'uuid-1', newStatus: 'CLOSED' } 
        });
        expect(res.ok).toBe(false);
        expect(res.error).toBe('MISSING_RESOLUTION_DATA');
      });
  });

  describe('5. Requisitos de Encerramento', () => {
    it('deve bloquear CLOSED sem root_cause', async () => {
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'uuid-1', status: 'REGRESSION_VERIFIED' },
        error: null
      });

      // @ts-ignore
      const res = await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'CLOSED', fixApplied: 'FIX', validationNotes: 'VAL', regressionVerified: true } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe('MISSING_RESOLUTION_DATA');
    });
  });

  describe('7. Circuit Breaker', () => {
    it('falha fatal no banco deve ativar circuit breaker', async () => {
      mockQueryBuilder.insert.mockImplementationOnce(() => {
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
