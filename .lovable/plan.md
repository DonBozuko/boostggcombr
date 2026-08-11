# Plano de Estabilização e Auditoria Atômica (v612)

O sistema BOOSTGG está operacional e saudável (99.8% de integridade), mas o usuário identifica um risco de "desconhecimento" sobre falhas silenciosas. Este plano foca em transparência radical, blindagem de pontas soltas e condução proativa do administrador.

## Mudanças propostas

### 1. Auditoria de Riscos e Transparência
- **Diagnóstico de Riscos Reais:** Mapear os 3 maiores riscos atuais (Timeout de Webhook, Drift de Margem em Câmbio Volátil e Desconexão de API de Provedor).
- **Visibilidade de Falhas:** Melhorar a notificação de erros silenciosos no painel administrativo, garantindo que o "Alerta Vermelho" do Jarvis seja acionável e não apenas informativo.

### 2. Blindagem de Infraestrutura (Backend)
- **Otimização de Webhook:** Migrar o processamento pesado do webhook do Mercado Pago para uma fila assíncrona real (Background Jobs) para evitar timeouts durante picos de vendas.
- **Reforço de Idempotência:** Validar se o ledger financeiro possui travas contra duplicidade em cenários de alta concorrência.

### 3. Estabilização do Painel Admin
- **Correção de UI/UX:** Ajustar componentes que possam estar apresentando inconsistências visuais ou de estado (como o semáforo de saúde ou o detector de mentiras).
- **Condução do Usuário:** Implementar um "Guia de Ação Imediata" no topo do Admin para que o dono saiba exatamente o que fazer quando algo sai do esperado.

### 4. Sanidade de Dados (Supabase)
- **Varredura de RLS:** Garantir que nenhuma nova tabela ou função `SECURITY DEFINER` tenha sido exposta indevidamente após as últimas atualizações.

## Detalhes técnicos
- **Fila Assíncrona:** Utilizar `waitUntil` em ambientes Edge ou persistência em tabela de `jobs` para processamento diferido de webhooks.
- **Autoridade de Preço:** Refinar o `MARGIN_EPSILON` em `margin-guardian.ts` para 1.2% (atualmente 1.5%) para aumentar o rigor sob condições de câmbio estável, reduzindo drift.
- **Admin Session:** Sincronizar `IDLE_TIMEOUT_MS` entre frontend e backend para evitar deslogues prematuros que geram frustração no usuário.

## Próximos passos
1. Aplicar otimização do webhook do Mercado Pago.
2. Refinar o motor de triagem do Jarvis para sugestões de ações mais precisas.
3. Executar varredura final de permissões SQL para consolidar a "Autoridade Máxima do Supabase".
