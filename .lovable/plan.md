# Plano de Estabilização e Veracidade Jarvis (v628)

O objetivo é resolver a inconsistência entre o status reportado pelo J.A.R.V.I.S. (Semáforo Verde/Amarelo) e a realidade operacional (DATABASE_ERROR e PROFILE_NOT_FOUND no funil, receita estagnada).

## Diagnóstico
1. **DATABASE_ERROR**: Ocorre quando o `criarPedido` (server function) falha ao inserir no Supabase. Isso é um erro crítico de infraestrutura que deve disparar Alerta Vermelho.
2. **PROFILE_NOT_FOUND**: Ocorre quando o `preflightTargetOrBlock` identifica que o perfil não existe. No funil, isso aparece como falha de Pix, o que é tecnicamente correto (o checkout é bloqueado antes de gerar o Pix), mas o admin não está sendo alertado sobre picos dessas falhas.
3. **Semáforo Omissivo**: O `getJarvisTriage` foca em pedidos pagos travados e alertas explícitos em `jarvis_alerts`. Erros de "Tentativa de Compra" (DATABASE_ERROR) não estão sendo registrados como alertas, tornando o semáforo cego para falhas no topo do funil.

## Ações

### 1. Registro de Falhas Críticas de Checkout
Alterar `src/lib/pedidos.functions.ts` para registrar erros de banco de dados (`DATABASE_ERROR`) e erros inesperados do gateway de pagamento como alertas críticos em `jarvis_alerts`.

### 2. Triagem Inteligente de Funil
Atualizar `src/lib/jarvis-triage.functions.ts` para incluir uma verificação de saúde do checkout:
- Se houver `DATABASE_ERROR` nos últimos 15 minutos → **Status Vermelho**.
- Se houver um pico anômalo de `PROFILE_NOT_FOUND` ou `INVALID_TARGET` → **Status Amarelo** (pode ser ataque de spam ou instabilidade na API do Instagram).

### 3. Melhoria na Classificação de Severidade
Ajustar `src/lib/alert-severity.ts` para garantir que `DATABASE_ERROR` seja categorizado como `critical`.

### 4. Visibilidade no Painel Funil
Garantir que o `FunilEtapasPanel` destaque erros de sistema (DATABASE_ERROR) de forma distinta de erros de usuário (PROFILE_NOT_FOUND).

## Detalhes Técnicos
- Utilizar `supabaseAdmin` para inserir em `jarvis_alerts` com `severidade='critical'`.
- Adicionar contadores de erros de checkout no payload do `getJarvisTriage`.
- Implementar detecção de anomalia simples (ex: > 3 falhas de banco seguidas).
