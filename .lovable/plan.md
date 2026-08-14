# Plano de Implantação: Entidade jarvis_incidents (v636)

Criação da estrutura de dados para o ciclo de vida de incidentes no J.A.R.V.I.S. NOC, garantindo consistência atômica, RLS restritivo e rastreabilidade total sem afetar o fluxo financeiro ou de checkout.

## 1. Banco de Dados (Supabase Migration)

### Estrutura da Tabela `public.jarvis_incidents`
- `id`: uuid primary key (default gen_random_uuid())
- `created_at`: timestamptz (default now())
- `updated_at`: timestamptz (default now())
- `status`: enum `incident_status`
- `severity`: enum `alert_severity` (alinhado com `src/lib/alert-severity.ts`)
- `type`: text (ex: 'DATABASE_ERROR', 'API_TIMEOUT')
- `headline`: text
- `origin`: text (vínculo com a origem do alerta)
- `root_cause`: text (opcional)
- `fix_applied`: text (opcional)
- `validation_notes`: text (opcional)
- `regression_verified`: boolean (default false)
- `closed_at`: timestamptz (null até CLOSED)
- `alert_ids`: uuid[] (vínculo com `jarvis_alerts.id`)
- `audit_log_ids`: uuid[] (vínculo com `admin_audit_logs.id`)

### Enums
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

CREATE TYPE public.alert_severity AS ENUM (
  'critical',
  'error',
  'warning',
  'info'
);
```

### RLS e Permissões
- `ENABLE ROW LEVEL SECURITY`
- `GRANT SELECT, INSERT, UPDATE ON public.jarvis_incidents TO authenticated`
- `GRANT ALL ON public.jarvis_incidents TO service_role`
- Policy: Somente administradores (via `public.has_role`) podem interagir.

## 2. Implementação Técnica

- **Migration SQL**: Script determinístico com `CREATE TABLE` e `GRANT`.
- **Backend API**: Criação de `src/lib/jarvis-incidents.server.ts` para operações de backend.
- **Circuit Breaker**: Garantia de que falhas na gravação de incidentes não bloqueiem processos de negócio.

## 3. Validação Operacional

- Verificação de schema e constraints.
- Testes de RLS (acesso negado para não-admin).
- Validação de que checkout e financeiro permanecem intocados.

---
*Status: Aguardando aprovação para execução.*
