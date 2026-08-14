import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectIncidentFromAlert } from './jarvis-incidents-logic.server';

const mockSingle = vi.fn();
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockSelect = vi.fn();
const mockLimit = vi.fn();
const mockGte = vi.fn();
const mockNot = vi.fn();
const mockEq = vi.fn();

vi.mock('@/integrations/supabase/client.server', () => ({
  supabaseAdmin: {
    from: vi.fn((table) => {
      if (table === 'jarvis_incidents') {
        return {
          select: mockSelect,
          insert: mockInsert,
          eq: mockEq,
          not: mockNot,
          gte: mockGte,
          limit: mockLimit,
        };
      }
      return {
        insert: vi.fn(() => ({ error: null })),
      };
    }),
  },
}));

describe('Jarvis Incidents Integration Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve criar incidente para alerta novo', async () => {
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ not: mockNot });
    mockNot.mockReturnValue({ gte: mockGte });
    mockGte.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue({ data: [], error: null });

    mockSingle.mockResolvedValue({ data: { id: 'new-inc-123' }, error: null });

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
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ not: mockNot });
    mockNot.mockReturnValue({ gte: mockGte });
    mockGte.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue({ data: [{ id: 'existing-inc-456' }], error: null });

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
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
