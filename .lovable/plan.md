# Plano de Implantação: Tabela `jarvis_incidents` (v636.1 - Revisado)

Objetivo: Criar a infraestrutura de dados para gestão de incidentes com rigor de integridade, deduplicação e máquina de estados em nível de banco de dados.

## Alterações Técnicas

### 1. Banco de Dados (Migration SQL)
Implementar o schema `public.jarvis_incidents` com as seguintes proteções:
- **Idempotência Total**: Uso de blocos `DO $$` para criação de tipos `alert_severity` e `incident_status`.
- **Deduplicação Inteligente**: Índice único parcial em `dedup_key` para incidentes não encerrados.
- **Constraints de Integridade**: Garantir que um incidente `CLOSED` possua `root_cause`, `validation_notes` e `closed_at`.
- **Automação de Timestamp**: Trigger para atualização automática de `updated_at`.
- **Máquina de Estados**: Trigger `BEFORE UPDATE` para validar transições de status (ex: não reabrir incidentes fechados sem passar pelos estados intermediários).
- **RLS Robusto**: Políticas administrativas utilizando `InitPlan` para performance.

### 2. Backend (Server Functions)
- **Circuit Breaker c/ Anti-Recursão**: Implementar flag de contexto em `src/lib/jarvis-incidents-logic.server.ts` para evitar loops infinitos em caso de erro na persistência do próprio incidente.
- **Despacho Fire-and-Forget**: Garantir que o registro de incidentes no fluxo de checkout não adicione latência, utilizando timeouts curtos e execução assíncrona.
- **Validação de Auditoria**: Garantir que logs em `admin_audit_logs` utilizem `supabaseAdmin` para contornar restrições de RLS do cliente.

## Plano de Validação
- **Teste de Idempotência**: Executar a migration duas vezes seguidas para garantir que não há erros.
- **Teste de Carga de Erros**: Simular tempestade de erros (1000/min) para validar a eficácia da `dedup_key`.
- **Validação de Transição**: Tentar forçar um status inválido via SQL para confirmar o bloqueio da trigger.

Aprovo a execução com este rigor técnico adicional.
