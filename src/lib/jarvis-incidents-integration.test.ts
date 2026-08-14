import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks manuais fluentes
const mockInsert = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockNot = vi.fn();
const mockGte = vi.fn();
const mockLimit = vi.fn();

// Configurar o encadeamento fluente global
const fluentMock = {
  select: mockSelect,
  insert: mockInsert,
  update: vi.fn().mockReturnThis(),
  eq: mockEq,
  not: mockNot,
  gte: mockGte,
  limit: mockLimit,
  single: mockSingle,
  order: vi.fn().mockReturnThis(),
};

// Fazer cada método retornar o objeto fluente
mockSelect.mockReturnValue(fluentMock);
mockInsert.mockReturnValue(fluentMock);
mockEq.mockReturnValue(fluentMock);
mockNot.mockReturnValue(fluentMock);
mockGte.mockReturnValue(fluentMock);
mockLimit.mockReturnValue(fluentMock);
mockSingle.mockReturnValue(fluentMock);

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => fluentMock),
  },
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
    // Re-configurar retornos padrão para evitar lixo de testes anteriores
    mockLimit.mockReturnValue(fluentMock);
    mockSingle.mockReturnValue(fluentMock);
  });

  it('deve criar incidente para alerta novo', async () => {
    // 1. Mock do SELECT inicial (deduplicação) -> retorna vazio
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    
    // 2. Mock do INSERT final -> retorna o novo incidente
    mockSingle.mockResolvedValueOnce({ data: { id: 'new-inc-123' }, error: null });

    const result = await detectIncidentFromAlert({
      id: 'alert-123',
      type: 'DATABASE_ERROR',
      severity: 'critical',
      origin: 'checkout',
      headline: 'Erro de banco no checkout',
    });

    expect(result.ok).toBe(true);
    expect(result.incidentId).toBe('new-inc-123');
    expect(mockInsert).toHaveBeenCalled();
  });

  it('deve deduplicar incidente se já existir um aberto nas últimas 4h', async () => {
    // 1. Mock do SELECT inicial (deduplicação) -> retorna incidente existente
    mockLimit.mockResolvedValueOnce({ data: [{ id: 'existing-inc-456' }], error: null });

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
    // Não deve chamar insert se duplicado
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
