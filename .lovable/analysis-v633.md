# Análise de Capacidade: Ciclo de Incidentes Jarvis (v633)

## 1. Análise de "admin_audit_logs"

A tabela `admin_audit_logs` possui a seguinte estrutura:
- `id` (uuid)
- `admin_email` (text)
- `action` (text)
- `detail` (jsonb)
- `created_at` (timestamptz)

### Avaliação do Ciclo
- **Detectado**: Pode ser registrado como uma `action` do tipo `incident:detected`.
- **Investigando / Causa Raiz / Correção / Validação / Regressão**: Podem ser registrados como novas entradas de log vinculadas ao incidente original através de um `incident_id` dentro do campo `detail`.
- **Encerrado**: Uma entrada final de log com a ação `incident:closed`.

**Veredito**: A tabela suporta o registro de *eventos* do ciclo, mas não suporta nativamente o *estado atual* do incidente de forma eficiente para consulta (ex: "quais incidentes estão abertos agora?"). Seria necessário varrer o log e reduzir os eventos para determinar o estado.

## 2. Análise de "jarvis_alerts"

A tabela `jarvis_alerts` possui:
- `id` (uuid)
- `severidade` (text)
- `origem` (text)
- `mensagem` (text)
- `detalhe` (text/json)
- `created_at` (timestamptz)

### Avaliação do Ciclo
- Atualmente, o sistema usa o prefixo `✅ RESOLVIDO` na mensagem para marcar alertas tratados.
- Não possui campos para `causa_raiz`, `status` estruturado ou `vinculo_incidente`.

## 3. Conclusão e Recomendação

### A. O que pode ser reutilizado
- `jarvis_alerts`: Como fonte primária de **Sinais/Alertas**. O alerta é o gatilho.
- `admin_audit_logs`: Como **Histórico/Auditoria** detalhado de cada passo dado pelo operador/Jarvis.

### B. O que precisa ser adaptado
- O motor de triagem (`getJarvisTriage`) precisará ler o estado do incidente para decidir se o alerta ainda é um problema "novo" ou um "incidente em curso".

### C. O que não pode ser reutilizado (Limitações)
- **Persistência de Estado**: Nem `logs` nem `alerts` (como estão hoje) permitem gerenciar o estado atômico de um incidente (ex: trocar de `investigating` para `identified`) sem gambiarras de texto (prefixos) ou queries pesadas de agregação.
- **Rastreabilidade**: Vincular múltiplos alertas a um único incidente e manter a causa raiz confirmada de forma estruturada.

### D. Uma nova tabela é realmente necessária?
**SIM.** Pelos seguintes motivos técnicos:
1. **Performance**: Consultar o estado atual do NOC exigiria um `SELECT DISTINCT ON` ou agregações complexas em `admin_audit_logs`, que cresce indefinidamente.
2. **Integridade**: `admin_audit_logs` é um log de *append-only*. Incidentes exigem uma tabela de *estado* (Update).
3. **Requisito "Causa Raiz"**: O protocolo v633 exige diferenciar sintoma de causa raiz. Colocar isso em JSON de log dificulta auditorias financeiras/operacionais futuras.

### Estrutura Proposta (`jarvis_incidents`)
- `id` (uuid)
- `status` (detected | investigating | identified | applied | validating | verified | closed)
- `severity` (info | warning | critical)
- `headline` (text)
- `root_cause` (text, null)
- `alert_ids` (uuid[], vinculo com jarvis_alerts)
- `created_at` / `updated_at`
- `metadata` (jsonb para evidências, resultados de regressão)

---

**PAREI.** Aguardo aprovação para criar a tabela `jarvis_incidents` ou instrução para prosseguir com reutilização forçada (mesmo com as limitações acima).
