---
name: Protocolo de Risco
description: DIRETRIZ PRINCIPAL — DESENVOLVIMENTO ACIMA DE AUDITORIA (v623)
type: preference
---
# Protocolo de Risco (v623) — DESENVOLVIMENTO > AUDITORIA

A auditoria é um mecanismo de segurança e qualidade, NÃO é o objetivo principal. O foco é a evolução funcional do produto.

## 1. Prioridade Absoluta: Construir e Entregar
**CONSTRUIR → IMPLEMENTAR → TESTAR → CORRIGIR → ENTREGAR.**

## 2. Matriz de Autonomia e Execução

| Tipo de ação | Comportamento |
| :--- | :--- |
| **Texto, título, descrição, UI isolada** | 🟢 **Execução Direta** (Build First) |
| **SEO isolado (meta, conteúdo, roteamento)** | 🟢 **Execução Direta** (Build First) |
| **CSS/Componente visual** | 🟢 **Execução Direta** + Teste Simples |
| **Refatoração Multi-rota / Lógica de App** | 🟡 **Investigar + Plano** (Se houver risco real) |
| **Auth, Supabase, RLS, Financeiro** | 🔴 **Investigação Completa + Aprovação** |
| **Checkout, Despacho, Fornecedores** | 🔴 **Investigação Completa + Aprovação** |

## 3. Regra "Build First"
Se for possível implementar uma solução segura diretamente, implemente. Não transformar solicitações simples em auditorias extensas ou relatórios forenses. Auditoria profunda somente quando houver erro, risco de quebra crítica ou solicitação explícita.

## 4. Auditoria Leve por Padrão
Após implementação, realizar apenas verificação objetiva: compilação, erros evidentes e regressões diretas. Evitar o "Modo Auditor Permanente" (termos como "auditoria forense", "estado de integridade" ou "sincronia de âncoras" não devem dominar a resposta).

## 5. Resolução de Problemas
**DETECTAR → EXPLICAR → CORRIGIR → TESTAR → CONTINUAR.**
A descoberta da causa raiz é o começo da correção, não o fim da tarefa. Após validar, retornar imediatamente ao objetivo principal do projeto.