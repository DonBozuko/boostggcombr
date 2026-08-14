# Validação de Arquitetura Jarvis: Ciclo de Incidentes (v634)

## 1. Comparação Arquitetural Objetiva

| Critério | admin_audit_logs | jarvis_alerts | jarvis_incidents (Proposta) |
| :--- | :--- | :--- | :--- |
| **Modelo** | Event-Sourcing (Append-only) | Status-Flag (Mensagem) | State-Machine (Entidade) |
| **Estado Atual** | Reconstrução via agregação | Campo de texto (✅) | Enum nativo (status) |
| **Transições** | Novas linhas de log | Edição de mensagem | Update de registro |
| **Histórico** | Nativo (imutável) | Sobrescreve (perde original) | Registro dedicado |
| **Idempotência** | Difícil (requer check prévio) | Risco de conflito de texto | Chave única (incidente_id) |
| **Consultas NOC**| Pesadas (Aggregate scan) | Médias (Full text search) | Leves (Index scan) |
| **Retenção** | Infinita (Auditoria) | Curta (Rotatividade) | Longa (Causa Raiz) |

## 2. Análise Específica

### Sobre "admin_audit_logs"
- **Por que não representa o estado?**: Ele é um diário, não um quadro de avisos. Para saber se um incidente de "DATABASE_ERROR" ainda está aberto, o sistema precisa ler todos os logs recentes e verificar se o último evento foi "detectado" e não houve um "encerrado". 
- **O que falta?**: Falta a capacidade de **Update Atômico**. Logs não devem ser alterados. Se um incidente muda de "Investigando" para "Causa Raiz Identificada", o log registra o movimento, mas não o "lugar onde o incidente está agora".
- **Alternativa sem nova tabela**: Sim, é possível usar uma `action: "incident_snapshot"` que salve o estado consolidado a cada mudança, mas isso gera redundância de dados dentro de uma tabela de auditoria.
- **Risco**: Misturar eventos imutáveis (Ex: "Admin alterou preço") com estados mutáveis (Ex: "Incidente mudou para Investigando") corrompe o propósito original da `admin_audit_logs`, que é ser a prova legal de ações administrativas.

### Sobre "jarvis_alerts"
- **Conceito**: Deve continuar representando **Sinais**. Um alerta é um "grito" do sistema. Muitos alertas (sinais) podem compor um único Incidente (problema real).
- **Risco**: Se transformarmos alertas em incidentes, perdemos a distinção entre "O banco caiu 10 vezes" (10 alertas) e "Tivemos 1 queda de banco duradoura" (1 incidente).

## 3. Limitação Concreta Encontrada (O Problema Real)

**A Falta de Entidade com Ciclo de Vida.**
Atualmente, não existe um lugar no sistema BOOSTGG onde possamos perguntar: *"Jarvis, qual é a Causa Raiz confirmada do incidente de checkout de ontem às 14h e qual teste de regressão provou que ela foi eliminada?"*

- No `admin_audit_logs`, essa informação estaria espalhada em 5 ou 6 linhas de JSON, dificultando a rastreabilidade automática pelo Jarvis para evitar recorrência.
- No `jarvis_alerts`, a informação seria perdida assim que o alerta fosse "Resolvido" (limpeza de 24h).

## 4. Schema Proposto (SOMENTE TEXTO) - "jarvis_incidents"

- **id**: `uuid` (PK)
- **slug**: `text` (Ex: `checkout-db-error-2023-08-14`)
- **status**: `enum` (`detected`, `investigating`, `root_cause_identified`, `fix_applied`, `validating`, `regression_passed`, `closed`)
- **severity**: `text` (`info`, `warning`, `critical`)
- **headline**: `text`
- **root_cause**: `text` (Obrigatório para fechar)
- **fix_evidence**: `text` (Link ou descrição da correção)
- **regression_log**: `jsonb` (Resultados dos testes executados)
- **alert_ids**: `uuid[]` (FKs para `jarvis_alerts`)
- **audit_ids**: `uuid[]` (FKs para `admin_audit_logs` que registram as ações deste incidente)
- **created_at / updated_at / closed_at**: `timestamptz`

**RLS**: 
- Select: `authenticated` (admin)
- Insert/Update: `service_role` ou `authenticated` via função de segurança.

## 5. Recomendação Final

**Classificação: B. ADAPTAR E NÃO CRIAR TABELA (Com Ressalvas)**

Apesar da superioridade da nova tabela, a diretriz v634 exige evitar migrações se houver alternativa segura. 
**Proposta de Adaptação**: Utilizar a tabela `admin_settings` para armazenar o estado *volátil* dos incidentes ativos.
1. Criar uma chave `active_incidents` em `admin_settings`.
2. Armazenar um JSON com o estado atual de cada incidente aberto.
3. Registrar cada transição de estado na `admin_audit_logs` (imutabilidade).
4. Ao fechar o incidente, o JSON é movido para o log de auditoria final e removido da `admin_settings`.

**Vantagem**: Zero migração de banco. Reutiliza tabelas existentes. Resolve o problema do "Estado Atual" para o NOC.

## 6. Próximo Passo
Aguardar decisão do Diretor: 
1. Seguir com a **Adaptação (B)** via `admin_settings`.
2. Ou aprovar a **Nova Tabela (C)** por ser mais robusta para auditoria de longo prazo.

**NENHUMA ALTERAÇÃO REALIZADA.**
