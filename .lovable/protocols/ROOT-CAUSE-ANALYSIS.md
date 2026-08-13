# Protocolo de Engenharia de Software: Resolução de Problemas Críticos (BOOSTGG)
**Versão:** 1.0.0 (v629)
**Status:** ATIVO
**Prioridade:** Segurança, Estabilidade, Integridade Financeira.

## 1. Fase de Diagnóstico (Análise da Causa Raiz)
Toda intervenção deve iniciar com a identificação sistemática da origem do erro.
- **Pergunta Central:** Por que isso está acontecendo *agora* e não antes?
- **Evidência:** Logs, rastreamento de pilha (stack trace), ou inconsistência de dados no Ledger.
- **Isolamento:** Separar sintomas (ex: erro no Jarvis) da causa (ex: falha na RPC do banco).

## 2. Documentação Obrigatória do Problema
Antes de modificar o código, a IA deve documentar:
- **Explicação:** Descrição concisa da natureza técnica do problema.
- **Motivo Exato:** O gatilho específico que causou a falha.
- **Efeitos Colaterais Atuais:** O que mais está sendo impactado pela falha (cascata).

## 3. Avaliação de Impacto e Estratégia
Analise pelo menos **3 estratégias** de correção:
1. **Estratégia A (Rápida/Contenção):** Minimiza o dano imediato, risco baixo de regressão.
2. **Estratégia B (Estrutural/Definitiva):** Resolve a causa raiz, pode exigir refatoração moderada.
3. **Estratégia C (Resiliência/Arquitetural):** Implementa novos padrões de segurança/idempotência.

**Justificativa:** Comparar prós/contras priorizando a **Segurança do Sistema**.

## 4. Plano de Implementação Controlada
- **Lista de Arquivos:** Relação completa de arquivos afetados.
- **Impacto em Módulos:** Como as dependências (Pricing, Dispatch, Ledger) reagirão à mudança.
- **Idempotência:** Garantir que a correção possa ser executada múltiplas vezes sem danos.

## 5. Validação Pós-Correção e Regressão
A tarefa só é considerada concluída após:
1. **Reanálise de Regressão:** Testar fluxos críticos (Checkout, Webhook, Admin).
2. **Correção de Regressões:** Se detectadas, devem ser tratadas como prioridade zero.
3. **Validação Final:** Testes unitários/integração (Vitest) devem estar 100% verdes.

---
*Este protocolo é uma diretriz formal para a IA de codificação no projeto BOOSTGG.*
