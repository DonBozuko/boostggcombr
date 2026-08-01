---
name: Dívidas técnicas aceitas
description: Itens conhecidos que decidimos NÃO consertar e o motivo — não reabrir sem novo motivo de negócio
type: constraint
---

# Dívidas aceitas (decisão consciente, não esquecimento)

## 1. Cores hardcoded em componentes (~432 ocorrências)
Decisão: **não mexer**. Mexeria em 60+ arquivos de venda para ganho puramente
estético, sem retorno de negócio, com risco real de quebrar layout que converte.
Só reabrir se entrarmos com tema claro/escuro ou rebranding.

## 2. Arquivos grandes (>600 linhas): `admin.tsx` (2474), `index.tsx` (1421), `mp-webhook.ts` (840)
Decisão: **não quebrar agora**. São os arquivos de maior risco de regressão do
sistema. Quebrar em pedaços é refactor de zona vermelha sem ganho para o cliente.
Feature nova nasce em módulo próprio; esses só se movem em ciclo dedicado.

## 3. `console.log` em servidor (webhook, despacho, preço)
Decisão: **manter**. É trilha forense. Apagar piora investigação de pedido
perdido. O medidor foi calibrado (v399) para só apontar log que roda no
navegador do cliente.

**Why:** dívida registrada é dívida controlada. Sem esta lista, cada auditoria
nova reabre a mesma discussão e gera trabalho que não melhora resultado.
