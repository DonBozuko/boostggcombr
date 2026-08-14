# Plano de Implantação: Entidade jarvis_incidents (v636)

Criação da estrutura de dados para o ciclo de vida de incidentes no J.A.R.V.I.S. NOC, garantindo consistência atômica, RLS restritivo e rastreabilidade total sem afetar o fluxo financeiro ou de checkout.

## 1. Banco de Dados (Supabase Migration)

### Estrutura da Tabela `public.jarvis_incidents`
- `id`: uuid primary key (default gen_random_uuid())
- `created_at`: timestamptz (default now())
- `updated_at`: timestamptz (default now())
- `status`: enum `incident_status`
- `severity`: enum `app_severity` (reutilizando tipo existente se disponível, ou novo)
- `type`: text (ex: 'DATABASE_ERROR', 'API_TIMEOUT')
- `headline`: text
- `origin`: text (vínculo com a origem do alerta)
- `root_cause`: text (opcional até ROOT_CAUSE_IDENTIFIED)
- `fix_applied`: text (opcional até FIX_APPLIED)
- `validation_notes`: text (opcional)
- `regression_verified`: boolean (default false)
- `closed_at`: timestamptz (null até CLOSED)
- `created_by`: uuid (references auth.users)
- `assigned_to`: uuid (references auth.users, opcional)
- `alert_ids`: uuid[] (vínculo com `jarvis_alerts.id`)
- `audit_log_ids`: uuid[] (vínculo com `admin_audit_logs.id`)

### Enums e Tipos
```sql
CREATE TYPE public.incident_status AS ENUM (
  'DETECTED',
  'INVESTIGATING',
  'ROOT_CAUSE_IDENTIFIED',
  'FIX_APPLIED',
  'VALIDATING',
  'REGRESSION_VERIFIED',
  'CLOSED'
);
```

### RLS e Permissões
- `ENABLE ROW LEVEL SECURITY`
- `GRANT SELECT, INSERT, UPDATE ON public.jarvis_incidents TO authenticated`
- `GRANT ALL ON public.jarvis_incidents TO service_role`
- Policy: Somente usuários com `has_role(auth.uid(), 'admin')` podem operar a tabela.

## 2. Implementação Técnica

- **Migration SQL**: Script determinístico com `IF NOT EXISTS` e `GRANT`.
- **Types**: Atualização de `src/integrations/supabase/types.ts` via introspecção automática (pós-migration).
- **Funções de Acesso**: Criação de `src/lib/jarvis-incidents.server.ts` com funções CRUD mínimas protegidas por `supabaseAdmin`.

## 3. Validação Operacional (Pós-Migration)

- Verificação de constraints de integridade (status válido).
- Verificação de políticas RLS (bloqueio de acesso `anon`).
- Teste de idempotência da migration.

## Detalhes Técnicos

- **Concorrência**: Uso de `updated_at` e locks de linha para evitar condições de corrida em transições de estado.
- **Isolamento**: A nova tabela não possui FKs obrigatórias para tabelas financeiras, prevenindo efeitos cascata em caso de deleção.
- **Rastreabilidade**: Cada transição de status deve ser acompanhada de um registro em `admin_audit_logs` (a ser implementado na lógica de aplicação na Etapa C).

---
*Status: Aguardando execução da migration.*
