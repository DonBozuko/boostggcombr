# Plano v617: Blindagem Antidote Pro (Execução Forense)

Este plano ataca a causa raiz do caractere invisível `U+2063` (Invisible Separator) que persiste no DOM, possivelmente injetado por scripts externos ou cache, causando erros de layout ou alertas no sistema.

## Diagnóstico Técnico
- **Sintoma:** Caractere `\u2063` (⁣) detectado como primeiro elemento do `body` ou em spans dinâmicos.
- **Causa Raiz:** Injeção via scripts de terceiros (TikTok/Google Analytics) ou persistência em strings de tradução/template injetadas em tempo de execução que burlam o sanitizador passivo atual.
- **Evidência:** O sanitizador em `src/routes/__root.tsx` usa `requestIdleCallback`, o que pode deixar uma janela de milissegundos onde o caractere é visível e indexado pelo agente.

## Ações de Execução

### 1. Reforço da Blindagem DOM (Antidote Pro)
- Modificar `src/routes/__root.tsx` para usar um `MutationObserver` mais agressivo que remove o caractere no momento da inserção (`sync`), em vez de esperar pelo `idle`.
- Adicionar remoção específica para spans que contenham apenas o caractere invisível, tratando-os como "nós de injeção externa".

### 2. Blindagem de Estilo (CSS Layer)
- Implementar regra no `src/styles.css` para esconder qualquer elemento que contenha apenas o caractere `\u2063` via seletor de atributo ou pseudo-classe, caso a remoção JS falhe momentaneamente.

### 3. Saneamento de Componentes Críticos
- Revisar `src/components/SocialProofPopup.tsx` para garantir que as strings dinâmicas (`item.person.name`, `item.city`) passem por uma higienização antes de serem renderizadas.

## Relatório Forense Final
- **🔴 SINTOMA:** Caractere `U+2063` (Invisible Separator) persistente.
- **🧬 CAUSA RAIZ:** Janela de latência no sanitizador `requestIdleCallback` e injeção externa síncrona.
- **🔎 EVIDÊNCIA:** Localizado no log de inspeção do agente e no regex de `src/routes/__root.tsx`.
- **⚠️ IMPACTO:** Ruído visual, falhas em testes automatizados e possível degradação de SEO (caracteres estranhos no snippet).
- **🛠️ CORREÇÃO:** Sanitização síncrona + Blindagem CSS + Higienização de Props.

## Como Validar
- Executar `npm run build` para garantir que o sanitizador não quebra o bundle.
- Verificar via console do navegador se o caractere `\u2063` ainda é detectável após a carga de scripts externos.
