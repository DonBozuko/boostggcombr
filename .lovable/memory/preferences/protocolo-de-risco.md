---
name: Protocolo de Risco
description: Define a matriz de autonomia e execução baseada na criticidade da tarefa.
type: preference
---
# Protocolo de Risco (v622)

Este protocolo define a matriz de autonomia e os ritos de passagem para cada tipo de ação no projeto BOOSTGG.

## Matriz de Autonomia

| Tipo de ação | Comportamento |
| :--- | :--- |
| **Texto, título, descrição, UI isolada** | 🟢 **Executar diretamente** |
| **CSS/componente isolado** | 🟢 **Executar + testar** |
| **SEO de uma rota, meta, conteúdo** | 🟢 **Executar + validar** |
| **Refatoração envolvendo várias rotas** | 🟡 **Investigar + plano (.lovable/plan.md)** |
| **Auth, Supabase, RLS** | 🟡/🔴 **Investigar + aprovação obrigatória** |
| **Checkout, Mercado Pago, financeiro** | 🔴 **Investigar + aprovação obrigatória** |
| **Dispatch/fornecedor/saldo** | 🔴 **Investigar + aprovação obrigatória** |
| **Migração de banco** | 🔴 **Investigar + aprovação obrigatória** |
| **Alteração global de infraestrutura** | 🔴 **Investigar + aprovação obrigatória** |

## Ritos de Execução

- **🟢 Ação Direta:** Implementar, validar via preview/build e reportar sucesso.
- **🟡 Planejamento:** Documentar causa raiz, impacto e passos no plano antes de tocar no código.
- **🔴 Crítico:** Auditoria forense completa + Plano + Aprovação explícita + Testes de regressão rigorosos + Validação de build.

## Invariante
Na dúvida entre categorias, o agente deve optar pelo nível de maior segurança (ex: se uma UI isolada toca em RLS, ela se torna 🔴).
