import { createFileRoute } from '@tanstack/react-router';
import { dispatchTelegramAlert, getTelegramEnvironmentStatus } from '@/lib/messaging';

export const Route = createFileRoute('/api/public/telegram/test-nervoso')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const secret = url.searchParams.get('secret');
        
        // Proteção simples para evitar spam de terceiros, mas acessível para o Sócio
        if (secret !== 'v498-nervoso') {
          return new Response('Unauthorized', { status: 401 });
        }

        const env = getTelegramEnvironmentStatus();
        
        const testMessage = `
🚨 <b>TESTE DO SISTEMA NERVOSO (Fase 1)</b>
Status: <b>OPERACIONAL</b>
Versão: <b>v498</b>

Ambiente:
- Chat ID: \${env.chatId ? '✅ Configurado' : '❌ Faltando'}
- Gateway Connector: \${env.connector ? '✅ Ativo' : '⚠️ Inativo'}
- Direct Bot: \${env.directBot ? '✅ Ativo' : '⚠️ Inativo'}

<i>Se você recebeu esta mensagem, o Sistema Nervoso do BOOSTGG está íntegro.</i>
`;

        const result = await dispatchTelegramAlert(testMessage, { 
          severity: 'critical', 
          force: true,
          origem: 'audit-v498' 
        });

        return new Response(JSON.stringify({
          success: result.ok,
          env,
          detail: result.detail
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  }
});
