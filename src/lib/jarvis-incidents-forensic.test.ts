import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  assertAdmin: async (token: string, action?: string) => {
    if (token === 'test-token-v636.2') return { ok: true, email: 'fabiano.majestic@gmail.com' };
    if (token === 'unauthorized-token') return { ok: false, reason: 'UNAUTHORIZED' };
    return { ok: false, reason: 'UNAUTHORIZED' };
  }
}));

// Mock do supabaseAdmin
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: mockFrom,
  }
}));

import { createIncident, updateIncidentStatus } from './jarvis-incidents.server';

describe('Auditoria Forense v636.2 - Relatório Final', () => {
  const token = 'test-token-v636.2';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configurar o encadeamento mockado
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert
    });
    
    mockSelect.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    
    // Suporte para .insert().select().single()
    const insertSelectChain = {
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
      })
    };
    mockInsert.mockReturnValue(insertSelectChain);
    
    mockEq.mockReturnValue({
      single: mockSingle,
      then: (resolve: any) => resolve({ error: null })
    });
  });

  describe('3. Validação de RLS (Simulada)', () => {
    it('deve bloquear acesso para usuário não-admin', async () => {
      // @ts-ignore
      const res = await createIncident({ 
        data: { token: 'unauthorized-token', type: 'TEST', headline: 'Test', severity: 'info', origin: 'test' } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe('UNAUTHORIZED');
    });

    it('deve permitir acesso para admin', async () => {
      // @ts-ignore
      const res = await createIncident({ 
        data: { token, type: 'TEST', headline: 'Test', severity: 'info', origin: 'test' } 
      });
      expect(res.ok).toBe(true);
    });
  });

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
        mockSingle.mockResolvedValueOnce({
          data: { id: 'uuid-1', status: from, root_cause: null, fix_applied: null },
          error: null
        });
        // @ts-ignore
        const res = await updateIncidentStatus({ 
          data: { token, incidentId: 'uuid-1', newStatus: to, ...(extra || {}) } 
        });
        expect(res.ok).toBe(true);
      });
    });
  });

  describe('5. Requisitos de Encerramento', () => {
    it('deve bloquear CLOSED sem root_cause', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'uuid-1', status: 'REGRESSION_VERIFIED' },
        error: null
      });
      // @ts-ignore
      const res = await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'CLOSED', fixApplied: 'FIX', validationNotes: 'VAL', regressionVerified: true } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain('MISSING_RESOLUTION_DATA');
    });

    it('deve bloquear CLOSED com regression_verified=false', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'uuid-1', status: 'REGRESSION_VERIFIED' },
        error: null
      });
      // @ts-ignore
      const res = await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'CLOSED', rootCause: 'RC', fixApplied: 'FIX', validationNotes: 'VAL', regressionVerified: false } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain('MISSING_RESOLUTION_DATA');
    });
  });

  describe('6. Auditoria (Integridade)', () => {
    it('deve registrar em admin_audit_logs em cada transição', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'uuid-1', status: 'DETECTED' },
        error: null
      });
      // @ts-ignore
      await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'INVESTIGATING' } 
      });
      
      const auditCalls = mockFrom.mock.calls.filter(c => c[0] === 'admin_audit_logs');
      expect(auditCalls.length).toBeGreaterThan(0);
    });
  });

  describe('7. Circuit Breaker', () => {
    it('falha fatal no banco deve ativar circuit breaker', async () => {
      mockFrom.mockImplementationOnce(() => { throw new Error("DB_CRASH"); });
      // @ts-ignore
      const res = await createIncident({ 
        data: { token, type: 'TEST', headline: 'Test', severity: 'info', origin: 'test' } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toBe('CIRCUIT_BREAKER_ACTIVE');
    });
  });
});
