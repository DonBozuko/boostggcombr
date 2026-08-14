# Plano de Implantação: Entidade jarvis_incidents (v636.1)

Criação da estrutura de dados para o ciclo de vida de incidentes no J.A.R.V.I.S. NOC, garantindo consistência atômica, RLS restritivo e rastreabilidade total sem afetar o fluxo comercial.

## 1. Banco de Dados (Supabase Migration)

### Estrutura da Tabela `public.jarvis_incidents`
- `id`: uuid primary key (default gen_random_uuid())
- `created_at`: timestamptz (default now())
- `updated_at`: timestamptz (default now())
- `status`: public.incident_status
- `severity`: public.alert_severity
- `type`: text (ex: 'DATABASE_ERROR')
- `headline`: text
- `origin`: text
- `root_cause`: text
- `fix_applied`: text
- `validation_notes`: text
- `regression_verified`: boolean (default false)
- `closed_at`: timestamptz
- `alert_ids`: uuid[] (rastreio de alertas relacionados)
- `audit_log_ids`: uuid[] (rastreio de logs de auditoria)

### Tipos e Enums
- `public.alert_severity`: ('critical', 'error', 'warning', 'info')
- `public.incident_status`: ('DETECTED', 'INVESTIGATING', 'ROOT_CAUSE_IDENTIFIED', 'FIX_APPLIED', 'VALIDATING', 'REGRESSION_VERIFIED', 'CLOSED')

### RLS e Permissões
- `GRANT SELECT, INSERT, UPDATE ON public.jarvis_incidents TO authenticated`
- `GRANT ALL ON public.jarvis_incidents TO service_role`
- Policy: Apenas usuários com `public.has_role(auth.uid(), 'admin')` podem acessar/editar.

## 2. Implementação do Backend (`src/lib/jarvis-incidents.server.ts`)

- **Máquina de Estados**: Validação rigorosa das transições (ex: impede encerramento sem causa raiz e validação).
- **Circuit Breaker**: Try-catch global para garantir que falhas no registro de incidentes não afetem o checkout.
- **Auditoria**: Registro automático em `admin_audit_logs` para cada transição de estado.

## 3. Validação Operacional

- Testes de integridade de tipos e constraints.
- Testes de RLS com diferentes perfis de usuário.
- Verificação de não-interferência no fluxo de pagamento e checkout.

---
*Status: Pronto para execução da migration v636.1.*
