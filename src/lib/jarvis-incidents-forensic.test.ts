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

// Mock do supabaseAdmin com lógica de transição para teste real da máquina de estados
const mockIncident = {
  id: 'uuid-1',
  status: 'DETECTED',
  root_cause: null,
  fix_applied: null,
  validation_notes: null,
  regression_verified: false
};

const mockInsert = vi.fn().mockResolvedValue({ data: { id: 'new-uuid' }, error: null });
const mockUpdate = vi.fn().mockResolvedValue({ data: null, error: null });
const mockAudit = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    insert: mockInsert,
    select: vi.fn().mockReturnThis(),
    update: mockUpdate,
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
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
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // @ts-ignore
        (supabaseAdmin.single as any).mockResolvedValueOnce({
          data: { ...mockIncident, status: from },
          error: null
        });


        // @ts-ignore
        const res = await updateIncidentStatus({ 
          data: { 
            token, 
            incidentId: 'uuid-1', 
            newStatus: to,
            ...(extra || {})
          } 
        });
        expect(res.ok).toBe(true);
      });
    });
  });

  describe('4. Máquina de Estados - Transições Inválidas', () => {
    const invalid = [
      { from: 'DETECTED', to: 'CLOSED' },
      { from: 'INVESTIGATING', to: 'CLOSED' },
      { from: 'FIX_APPLIED', to: 'CLOSED' },
      { from: 'CLOSED', to: 'CLOSED' }
    ];

    invalid.forEach(({ from, to }) => {
      it(`deve bloquear transição ${from} -> ${to}`, async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // @ts-ignore
        (supabaseAdmin.single as any).mockResolvedValueOnce({
          data: { ...mockIncident, status: from },
          error: null
        });


        // @ts-ignore
        const res = await updateIncidentStatus({ 
          data: { 
            token, 
            incidentId: 'uuid-1', 
            newStatus: to 
          } 
        });
        expect(res.ok).toBe(false);
        expect(res.error).toContain('INVALID_TRANSITION');
      });
    });
  });

  describe('5. Requisitos de Encerramento', () => {
    it('deve bloquear CLOSED sem root_cause', async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // @ts-ignore
      (supabaseAdmin.single as any).mockResolvedValueOnce({
        data: { ...mockIncident, status: 'REGRESSION_VERIFIED' },
        error: null
      });

      // @ts-ignore
      const res = await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'CLOSED', fixApplied: 'FIX', validationNotes: 'VAL', regressionVerified: true } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe('MISSING_RESOLUTION_DATA');
    });

    it('deve bloquear CLOSED com regression_verified=false', async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      // @ts-ignore
      (supabaseAdmin.single as any).mockResolvedValueOnce({
        data: { ...mockIncident, status: 'REGRESSION_VERIFIED', root_cause: 'RC', fix_applied: 'FIX', validation_notes: 'VAL' },
        error: null
      });

      // @ts-ignore
      const res = await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'CLOSED', regressionVerified: false } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe('MISSING_RESOLUTION_DATA');
    });
  });


  describe('7. Circuit Breaker', () => {
    it('falha no banco não deve lançar exceção (circuit breaker)', async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      (supabaseAdmin.from as any).mockImplementationOnce(() => ({
        insert: () => ({ select: () => ({ single: () => Promise.reject(new Error("FATAL_DB_ERROR")) }) })
      }));

      // @ts-ignore
      const res = await createIncident({ 
        data: { token, type: 'TEST', headline: 'Test', severity: 'info', origin: 'test' } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe('CIRCUIT_BREAKER_ACTIVE');
    });
  });
});
