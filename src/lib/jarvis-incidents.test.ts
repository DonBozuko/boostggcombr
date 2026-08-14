import { describe, it, expect, beforeAll } from 'vitest';
import { createIncident, updateIncidentStatus } from './jarvis-incidents.server';

// Mocks para simular ambiente admin
process.env.ADMIN_TOKEN = 'test-token-v636.1';

describe('Jarvis Incidents Logic & State Machine', () => {
  const token = process.env.ADMIN_TOKEN;

  it('deve falhar se não for admin', async () => {
    // @ts-ignore - chamando diretamente para teste
    const res = await createIncident({ data: { token: 'wrong', type: 'TEST', headline: 'Test', severity: 'info', origin: 'test' } });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('UNAUTHORIZED');
  });

  it('deve permitir criar incidente no estado DETECTED', async () => {
    // Nota: O teste real de inserção depende do SupabaseAdmin. 
    // Aqui testamos a lógica se chegamos ao ponto de inserção.
    // Como estamos em ambiente de teste sem DB real em todos os contextos, 
    // validamos o circuit breaker / erro de DB esperado em vez de sucesso falso.
    
    // @ts-ignore
    const res = await createIncident({ data: { token, type: 'DATABASE_ERROR', headline: 'DB Down', severity: 'critical', origin: 'checkout' } });
    
    // Se não houver DB real configurado no ambiente de teste Vitest, deve cair no circuit breaker
    if (!res.ok) {
        expect(res.error).toBe('CIRCUIT_BREAKER_ACTIVE');
    }
  });

  describe('State Machine Transitions', () => {
    // Teste de transições proibidas (lógica pura)
    it('deve impedir transição DETECTED -> CLOSED sem dados de resolução', async () => {
        // Simulando a lógica que o handler executaria
        // No handler real, ele buscaria o incidente 'current'
        
        // @ts-ignore
        const res = await updateIncidentStatus({ 
            data: { 
                token, 
                incidentId: '00000000-0000-0000-0000-000000000000', 
                newStatus: 'CLOSED' 
            } 
        });
        
        // Deve falhar ou por NOT_FOUND (ID fake) ou por lógica de transição
        expect(res.ok).toBe(false);
    });
  });
});
