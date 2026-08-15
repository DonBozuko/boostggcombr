import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks manuais fluentes corrigidos
const fluentMock = {
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
  then: vi.fn(), // Fundamental para await
};

// Configurar o encadeamento fluente global para que cada chamada de método retorne a si mesma
// e tenha uma implementação de 'then' que resolva a promessa.
const createFluentMock = () => {
  const m = { ...fluentMock };
  m.from = vi.fn().mockReturnValue(m);
  m.select = vi.fn().mockReturnValue(m);
  m.insert = vi.fn().mockReturnValue(m);
  m.update = vi.fn().mockReturnValue(m);
  m.eq = vi.fn().mockReturnValue(m);
  m.not = vi.fn().mockReturnValue(m);
  m.gte = vi.fn().mockReturnValue(m);
  m.limit = vi.fn().mockReturnValue(m);
  m.single = vi.fn().mockReturnValue(m);
  m.order = vi.fn().mockReturnValue(m);
  return m;
};

const instance = createFluentMock();

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: instance,
}));

// Mock do admin-guard
vi.mock("@/lib/admin-guard.server", () => ({
  assertAdmin: async (token: string) => {
    if (token === 'valid-token') return { ok: true };
    return { ok: false };
  }
}));

import { detectIncidentFromAlert } from './jarvis-incidents-logic.server';

describe('Jarvis Incidents Integration Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar incidente para alerta novo', async () => {
    // 1. Mock do SELECT inicial (deduplicação) -> retorna vazio
    instance.then = vi.fn()
      .mockImplementationOnce((resolve) => resolve({ data: [], error: null })) // Chamada deduplicação
      .mockImplementationOnce((resolve) => resolve({ data: { id: 'new-inc-123' }, error: null })) // Chamada single() após insert
      .mockImplementationOnce((resolve) => resolve({ error: null })); // Chamada auditoria

    const result = await detectIncidentFromAlert({
      id: 'alert-123',
      type: 'DATABASE_ERROR',
      severity: 'critical',
      origin: 'checkout',
      headline: 'Erro de banco no checkout',
    });

    expect(result.ok).toBe(true);
    expect(result.incidentId).toBe('new-inc-123');
    expect(instance.insert).toHaveBeenCalled();
  });

  it('deve deduplicar incidente se já existir um aberto nas últimas 4h', async () => {
    // 1. Mock do SELECT inicial (deduplicação) -> retorna incidente existente
    instance.then = vi.fn()
      .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'existing-inc-456', occurrence_count: 1 }], error: null }))
      // 2. Mock do UPDATE (incremento de ocorrências)
      .mockImplementationOnce((resolve) => resolve({ data: null, error: null }));

    const result = await detectIncidentFromAlert({
      id: 'alert-456',
      type: 'DATABASE_ERROR',
      severity: 'critical',
      origin: 'checkout',
      headline: 'Outro erro de banco',
    });

    expect(result.ok).toBe(true);
    expect(result.duplicated).toBe(true);
    expect(result.incidentId).toBe('existing-inc-456');
    // Não deve chamar insert se duplicado (o contador de chamadas do insert deve ser o do teste anterior ou zero se resetado)
    // No beforeEach resetamos mocks, então deve ser 0.
    expect(instance.insert).not.toHaveBeenCalled();
  });
});
