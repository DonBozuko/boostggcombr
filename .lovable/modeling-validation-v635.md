# Validação de Modelagem Jarvis: Ciclo de Incidentes (v635)

## 1. Verificação Técnica: "admin_settings" para Incidentes

### Análise de Estrutura e Comportamento
- **Múltiplos incidentes simultâneos?** Somente via um único campo JSON grande (ex: chave `active_incidents` contendo um array).
- **Identificador único?** Precisaria ser gerado manualmente no código (ex: `crypto.randomUUID()`) antes de salvar no JSON.
- **Armazenamento de campos?** Todos os 12+ campos solicitados (título, causa raiz, etc.) viveriam como chaves dentro do objeto JSON.
- **Concorrência e Sobrescrita?** **RISCO CRÍTICO.** Se dois processos tentarem atualizar incidentes diferentes simultaneamente, o que salvou por último sobrescreverá o estado de todo o array, pois `admin_settings` só permite `upsert` da linha inteira. Não há suporte nativo para `JSONB_APPEND` ou atualizações parciais atômicas via API.
- **Histórico?** O histórico de mudanças seria perdido em `admin_settings` (que guarda apenas o valor atual), a menos que cada transição fosse manualmente espelhada em `admin_audit_logs`.
- **NOC e Performance?** Para encontrar incidentes, o NOC teria que baixar o JSON completo, parsear no cliente/servidor e filtrar. Ineficiente para histórico longo.
- **Encerramento?** Ao encerrar, o dado teria que ser movido para outra chave (`archived_incidents`) ou apenas para os logs, correndo o risco de "desaparecer" da vista operacional se não houver uma consulta complexa de logs.
- **Relacionamentos?** Não existem chaves estrangeiras (FK) em JSON. A integridade com `jarvis_alerts` seria puramente baseada em fé na lógica do código.

## 2. Conclusão sobre "admin_settings"

**"admin_settings NÃO é adequado para estado de incidentes."**

O uso desta tabela para uma coleção de entidades com ciclo de vida introduz uma camada de complexidade frágil e perigosa (race conditions em atualizações de JSON) apenas para evitar uma migração de banco.

## 3. Comparação de Riscos de Modelagem

| Critério | admin_settings | admin_audit_logs | jarvis_incidents |
| :--- | :--- | :--- | :--- |
| **Integridade** | Baixa (JSON solto) | Média (Append-only) | **Alta (Schema-enforced)** |
| **Concorrência** | **Péssima (Race conditions)** | Boa (Novas linhas) | **Excelente (Row-level lock)** |
| **Histórico** | Nenhum (Volátil) | Nativo | **Nativo + Audit Log** |
| **Rastreabilidade**| Manual (Código) | Difícil (Text search) | **Nativa (FK / Indexes)** |
| **Idempotência** | Difícil | Complexa | **Nativa (Constraint)** |

## 4. Resultado Final

**Classificação: D. NOVA TABELA NECESSÁRIA**

### Justificativa Técnica (O Problema Concreto)
O problema que **não pode ser resolvido com a arquitetura atual** é a **Consistência Atômica de Estado em Ambiente Concorrente**. 

Em um sistema onde o Jarvis NOC (automatizado) e o Administrador (manual) podem detectar e agir sobre incidentes simultaneamente:
1. Reutilizar `admin_audit_logs` impede saber o "status agora" sem processamento pesado e impede atualizações (logs são imutáveis).
2. Reutilizar `admin_settings` cria o risco de perda de dados por sobrescrita (Last-Write-Wins em objeto JSON compartilhado).

A modelagem correta exige uma tabela onde cada incidente seja uma **linha individual**, permitindo que o banco de dados gerencie a concorrência, a integridade referencial com os alertas e a imutabilidade do histórico através de chaves primárias e constraints de data.

**PROPOSTA (STANDBY):** Criar `jarvis_incidents` conforme o schema detalhado na v634.

**NENHUMA ALTERAÇÃO REALIZADA.** Aguardo aprovação para a migração.
