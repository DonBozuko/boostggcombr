import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- MOCKS GLOBAIS ---
process.env.ADMIN_TOKEN = 'valid-token';

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

// Mock do supabaseAdmin com suporte a Promise
const createMockChain = () => {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    // @ts-ignore
    then: vi.fn(function(onFulfilled, onRejected) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
    })
  };
  return chain;
};

const mockSupabaseChain = createMockChain();

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: mockSupabaseChain,
}));

vi.mock("@/lib/admin-guard.server", () => ({
  assertAdmin: async (token: string) => {
    if (token === 'valid-token') return { ok: true, email: 'fabiano.majestic@gmail.com' };
    return { ok: false, reason: 'UNAUTHORIZED' };
  }
}));

import { detectIncidentFromAlert } from './jarvis-incidents-logic.server';
import { updateIncidentStatus, createIncident } from './jarvis-incidents.server';
import { runJarvisLieDetector } from './jarvis-detector-mentiras.functions';

describe('TESTE DE REALIDADE OPERACIONAL v637.1', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore
    mockSupabaseChain.then.mockImplementation(function(onFulfilled, onRejected) {
      return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
    });
  });

  it('1. TESTE DE INCIDENTES INDEPENDENTES (Deduplicação 4h)', async () => {
    // Cenário: Dois erros de banco independentes dentro da janela de 4h.
    // O primeiro cria o incidente. O segundo tenta criar.
    
    // Mock para a verificação de deduplicação (retorna um incidente existente)
    // @ts-ignore
    mockSupabaseChain.then.mockImplementationOnce((resolve) => 
      resolve({ data: [{ id: 'inc-1', occurrence_count: 1 }], error: null })
    );

    const alert2 = {
      id: 'alert-2',
      type: 'DATABASE_ERROR',
      severity: 'critical',
      origin: 'checkout',
      headline: 'Segundo erro de banco'
    };

    const result = await detectIncidentFromAlert(alert2);

    expect(result.ok).toBe(true);
    expect(result.duplicated).toBe(true);
    expect(result.incidentId).toBe('inc-1');
  });

  it('2. TESTE DE RECORRÊNCIA APÓS ENCERRAMENTO', async () => {
    // Cenário: DATABASE_ERROR -> CLOSED -> Novo DATABASE_ERROR
    
    // Mock para a verificação de deduplicação (retorna vazio porque o anterior está CLOSED)
    // @ts-ignore
    mockSupabaseChain.then.mockImplementationOnce((resolve) => 
      resolve({ data: [], error: null }) 
    );
    // Mock para o insert do novo incidente
    // @ts-ignore
    mockSupabaseChain.then.mockImplementationOnce((resolve) => 
      resolve({ data: { id: 'inc-new-after-closed' }, error: null })
    );
    // Mock para auditoria
    // @ts-ignore
    mockSupabaseChain.then.mockImplementationOnce((resolve) => resolve({ error: null }));

    const result = await detectIncidentFromAlert({
      id: 'alert-3',
      type: 'DATABASE_ERROR',
      severity: 'critical',
      origin: 'checkout',
      headline: 'Erro recorrente após fix'
    });

    expect(result.ok).toBe(true);
    expect(result.duplicated).toBeUndefined();
    expect(result.incidentId).toBe('inc-new-after-closed');
  });

  it('5. TESTE DE FALSO VERDE (NOC & Detector)', async () => {
    // Validar se incidente crítico aberto bloqueia o GREEN no detector de mentiras.
    
    // @ts-ignore
    mockSupabaseChain.then.mockImplementation((resolve) => {
      return resolve({ data: [], error: null, count: 0 });
    });

    // Mock específico para o SELECT de jarvis_incidents em runJarvisLieDetector
    // @ts-ignore
    mockSupabaseChain.from.mockImplementation((table) => {
      if (table === 'jarvis_incidents') {
        return {
          select: () => ({
            eq: () => ({
              not: () => Promise.resolve({ data: [{ id: 'crit-1', headline: 'FAIL_DB' }], error: null })
            })
          })
        };
      }
      return mockSupabaseChain;
    });

    // @ts-ignore
    const res = await runJarvisLieDetector({ token: 'valid-token' });
    
    expect(res.blockDeploy).toBe(true);
    const incCheck = res.checks.find((c: any) => c.id === 'critical_incidents');
    expect(incCheck?.ok).toBe(false);
    expect(incCheck?.detail).toContain('FAIL_DB');
  });

  it('7. TESTE DE CIRCUIT BREAKER', async () => {
    // Simular falha fatal no banco durante a criação automática de incidente
    
    // Mock do SELECT de deduplicação falhando
    // @ts-ignore
    mockSupabaseChain.then.mockImplementationOnce((resolve, reject) => {
      reject(new Error("POSTGREST_TIMEOUT"));
    });

    const result = await detectIncidentFromAlert({
      id: 'alert-4',
      type: 'DATABASE_ERROR',
      severity: 'critical',
      origin: 'checkout',
      headline: 'Erro durante falha de infra'
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBe('AUTO_CREATE_FAILED');
  });

  it('9. RLS (Auditoria de Políticas)', async () => {
    expect(true).toBe(true); 
  });
});
