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
const mockFrom = vi.fn();

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
    
    // Configuração do mock dinâmico baseado na tabela
    mockFrom.mockImplementation((table: string) => {
      const chain: any = {};
      
      chain.select = vi.fn().mockReturnThis();
      chain.update = vi.fn().mockReturnThis();
      chain.eq = vi.fn().mockReturnThis();
      chain.single = vi.fn();
      chain.insert = vi.fn();

      if (table === 'jarvis_incidents') {
        // Mock padrão para jarvis_incidents
        chain.insert.mockReturnValue({
          select: () => ({
            single: () => Promise.resolve({ data: { id: '1' }, error: null })
          })
        });
        
        // Mock padrao para updates
        chain.eq.mockReturnValue({
          single: chain.single,
          then: (resolve: any) => resolve({ error: null })
        });
      } else {
        // Outras tabelas (ex: admin_audit_logs)
        chain.insert.mockResolvedValue({ error: null });
      }

      return chain;
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
        // Customizamos o mockFrom para este teste específico para garantir o retorno do single()
        mockFrom.mockImplementation((table) => {
          if (table === 'jarvis_incidents') {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: 'uuid-1', status: from, root_cause: null, fix_applied: null },
                    error: null
                  })
                })
              }),
              update: () => ({
                eq: () => Promise.resolve({ error: null })
              })
            };
          }
          return { insert: () => Promise.resolve({ error: null }) };
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
      mockFrom.mockImplementation((table) => {
        if (table === 'jarvis_incidents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: 'uuid-1', status: 'REGRESSION_VERIFIED' },
                  error: null
                })
              })
            }),
            update: () => ({ eq: () => Promise.resolve({ error: null }) })
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
      });

      // @ts-ignore
      const res = await updateIncidentStatus({ 
        data: { token, incidentId: 'uuid-1', newStatus: 'CLOSED', fixApplied: 'FIX', validationNotes: 'VAL', regressionVerified: true } 
      });
      expect(res.ok).toBe(false);
      expect(res.error).toContain('MISSING_RESOLUTION_DATA');
    });

    it('deve bloquear CLOSED com regression_verified=false', async () => {
      mockFrom.mockImplementation((table) => {
        if (table === 'jarvis_incidents') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: 'uuid-1', status: 'REGRESSION_VERIFIED' },
                  error: null
                })
              })
            }),
            update: () => ({ eq: () => Promise.resolve({ error: null }) })
          };
        }
        return { insert: () => Promise.resolve({ error: null }) };
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
       mockFrom.mockImplementation((table) => {
        if (table === 'jarvis_incidents') {
          return {
            select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'uuid-1', status: 'DETECTED' }, error: null }) }) }),
            update: () => ({ eq: () => Promise.resolve({ error: null }) })
          };
        }
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
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
