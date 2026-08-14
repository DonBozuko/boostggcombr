import { describe, it, expect, vi } from 'vitest';

// Simular variáveis de ambiente para o admin-guard
process.env.ADMIN_TOKEN = 'test-token-v636.1';

// Mocks manuais para evitar TanStack Start context em testes de unidade pura
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


// Mock do assertAdmin para não depender de request context/headers
vi.mock("@/lib/admin-guard.server", () => ({
  assertAdmin: async (token: string) => {
    if (token === 'test-token-v636.1') return { ok: true, email: 'fabiano.majestic@gmail.com' };
    return { ok: false, reason: 'UNAUTHORIZED' };
  }
}));

// Mock do supabaseAdmin para não tentar conexão real
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: new Error("DB_OFFLINE") }),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  }
}));

import { createIncident, updateIncidentStatus } from './jarvis-incidents.server';

describe('Jarvis Incidents Logic & State Machine (Unit)', () => {
  const token = 'test-token-v636.1';

  it('deve falhar se não for admin', async () => {
    // @ts-ignore
    const res = await createIncident({ data: { token: 'wrong', type: 'TEST', headline: 'Test', severity: 'info', origin: 'test' } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('UNAUTHORIZED');
  });

  it('deve ativar circuit breaker se o banco falhar na criação', async () => {
    // @ts-ignore
    const res = await createIncident({ data: { token, type: 'DATABASE_ERROR', headline: 'DB Down', severity: 'critical', origin: 'checkout' } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('CIRCUIT_BREAKER_ACTIVE');
  });

  it('deve validar transição de estado proibida (ex: DETECTED -> CLOSED sem dados)', async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Mockando retorno de incidente no estado DETECTED
    // @ts-ignore
    (supabaseAdmin.single as any).mockResolvedValueOnce({
      data: { id: 'uuid-1', status: 'DETECTED', root_cause: null, fix_applied: null },
      error: null
    });


    // @ts-ignore
    const res = await updateIncidentStatus({ 
      data: { 
        token, 
        incidentId: 'uuid-1', 
        newStatus: 'CLOSED' 
      } 
    });
    
    expect(res.ok).toBe(false);
    expect(res.error).toContain('INVALID_TRANSITION');
  });
});
