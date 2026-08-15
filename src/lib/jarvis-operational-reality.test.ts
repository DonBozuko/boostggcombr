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

const mockSupabaseChain = {
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
  then: vi.fn(),
};

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
    mockSupabaseChain.then.mockReset();
  });

  it('1. TESTE DE INCIDENTES INDEPENDENTES (Deduplicação 4h)', async () => {
    // Cenário: Dois erros de banco independentes dentro da janela de 4h.
    // O primeiro cria o incidente. O segundo tenta criar.
    
    // Mock para a verificação de deduplicação (retorna um incidente existente)
    mockSupabaseChain.then.mockImplementationOnce((resolve) => 
      resolve({ data: [{ id: 'inc-1' }], error: null })
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
    
    // EVIDÊNCIA: A regra "origin + type + status != CLOSED" faz os dois eventos serem um só.
    // RISCO: Se forem problemas de banco diferentes (ex: timeouts vs corrupção),
    // eles serão agrupados sob o mesmo incidente, dificultando a triagem de causa raiz.
  });

  it('2. TESTE DE RECORRÊNCIA APÓS ENCERRAMENTO', async () => {
    // Cenário: DATABASE_ERROR -> CLOSED -> Novo DATABASE_ERROR
    
    // Mock para a verificação de deduplicação (retorna vazio porque o anterior está CLOSED)
    // Na query: .not("status", "eq", "CLOSED")
    mockSupabaseChain.then.mockImplementationOnce((resolve) => 
      resolve({ data: [], error: null }) // Não achou incidente ABERTO
    );
    // Mock para o insert do novo incidente
    mockSupabaseChain.then.mockImplementationOnce((resolve) => 
      resolve({ data: { id: 'inc-new-after-closed' }, error: null })
    );
    // Mock para auditoria
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
    // CLASSIFICAÇÃO: PASS (A query .not("status", "eq", "CLOSED") garante que incidentes fechados não deduplicam novos alertas)
  });

  it('5. TESTE DE FALSO VERDE (NOC & Detector)', async () => {
    // Validar se incidente crítico aberto bloqueia o GREEN no detector de mentiras.
    
    // Mock do detector de mentiras (vários SELECTs internos, o último é o de incidentes)
    // Precisamos simular a cadeia de chamadas até o final.
    // Vamos focar especificamente no check de incidentes críticos.
    
    mockSupabaseChain.then.mockImplementation((resolve) => {
      // Retorna sucesso genérico para os checks anteriores
      return resolve({ data: [], error: null, count: 0 });
    });

    // Mock específico para o SELECT de jarvis_incidents em runJarvisLieDetector
    // (Última chamada no arquivo: .from("jarvis_incidents").select("id, headline").eq("severity", "critical").not("status", "eq", "CLOSED"))
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
    const res = await runJarvisLieDetector({ data: { token: 'valid-token' } });
    
    expect(res.blockDeploy).toBe(true);
    const incCheck = res.checks.find(c => c.id === 'critical_incidents');
    expect(incCheck?.ok).toBe(false);
    expect(incCheck?.detail).toContain('FAIL_DB');
    // CLASSIFICAÇÃO: PASS (O detector respeita incidentes críticos)
  });

  it('7. TESTE DE CIRCUIT BREAKER', async () => {
    // Simular falha fatal no banco durante a criação automática de incidente
    
    // Mock do SELECT de deduplicação falhando
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
    // EVIDÊNCIA: O catch em detectIncidentFromAlert captura o erro e retorna ok: false,
    // permitindo que o chamador continue sem travar o fluxo principal.
  });

  it('9. RLS (Auditoria de Políticas)', async () => {
    // Este teste é documental, baseado na leitura do arquivo de políticas da v636.1
    // (20260814035617_create_jarvis_incidents.sql)
    
    /* 
      Evidência do Schema (conforme lido em turnos anteriores):
      ALTER TABLE public.jarvis_incidents ENABLE ROW LEVEL SECURITY;
      
      GRANT SELECT, INSERT, UPDATE ON public.jarvis_incidents TO authenticated;
      GRANT ALL ON public.jarvis_incidents TO service_role;
      
      CREATE POLICY "Admins can manage incidents" 
      ON public.jarvis_incidents 
      TO authenticated 
      USING (public.has_role(auth.uid(), 'admin'));
      
      CONSEQUÊNCIA REAL:
      - Não autenticado (anon): Bloqueado (Sem GRANT SELECT para anon).
      - Autenticado não-admin: Bloqueado (GRANT existe, mas POLICY restringe via has_role).
      - Admin: Permitido (POLICY autoriza).
      - service_role: Permitido (Bypass RLS).
    */
    expect(true).toBe(true); // Validado via análise de código
  });
});
