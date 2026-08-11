---
name: Protocolo de Risco
description: Define o fluxo de execução baseado na criticidade da tarefa.
type: preference
---
# Protocolo de Risco (v618)

Este protocolo define a autonomia do agente baseada na análise de risco da tarefa.

## Fluxo de Decisão

### 🟢 BAIXO RISCO
*   **Definição:** Mudanças puramente visuais (CSS), textos não críticos, logs informativos, documentação, ou ajustes que não tocam em lógica financeira, checkout ou entrega.
*   **Ação:** Executar diretamente sem interrupção.

### 🟡 RISCO MÉDIO
*   **Definição:** Alterações em componentes de UI que possuem lógica (formulários, modais), refatoração de código auxiliar, ou mudanças que afetam fluxos não críticos de navegação.
*   **Ação:** Investigar → apresentar plano (.lovable/plan.md) → pedir aprovação.

### 🔴 ALTO RISCO
*   **Definição:** Qualquer alteração no Ledger Financeiro, Checkout, Mercado Pago, Webhooks, RLS de banco de dados, Integração com Fornecedores, ou Motor de Preços.
*   **Ação:** Investigação completa → causa raiz → plano → aprovação obrigatória → execução → testes → build → validação final.

## Invariante
Na dúvida sobre a classificação do risco, o agente deve tratar como **ALTO RISCO**.
