# Plano v617: Blindagem Antidote Pro (Execução Forense)

Este plano ataca a causa raiz do caractere invisível `U+2063` (Invisible Separator) que persiste no DOM, possivelmente injetado por scripts externos ou cache, causando erros de layout ou alertas no sistema.

## Relatório Investigativo (Adicional)

### 1. FATO COMPROVADO
- **Inexistência no Fonte:** Não existem bytes literais `U+2063` nos arquivos de código do projeto (`src/`), exceto no sanitizador.
- **Inexistência em Dados Estáticos:** As listas de nomes, cidades e produtos em `SocialProofPopup.tsx` são strings limpas.
- **Vetor de Scripts:** O projeto carrega scripts externos agressivos (GTM, GA4, TikTok Pixel) que manipulam o DOM.

### 2. HIPÓTESE
- **Injeção de Terceiros (Vetor E):** Scripts externos utilizam caracteres invisíveis para marcação técnica ou beacons.
- **Latência do Sanitizador:** O `requestIdleCallback` atual permite que o caractere permaneça visível por alguns milissegundos antes da limpeza.

### 3. CAUSA RAIZ CONFIRMADA
**CAUSA RAIZ AINDA NÃO CONFIRMADA** (Vetor E é o suspeito principal, mas depende de execução de scripts de terceiros em tempo real).

---

## Ações de Execução

### 1. Reforço da Blindagem DOM (Antidote Pro)
- Modificar `src/routes/__root.tsx` para usar um `MutationObserver` mais agressivo que remove o caractere no momento da inserção (`sync`), em vez de esperar pelo `idle`.
- Adicionar remoção específica para spans que contenham apenas o caractere invisível.

### 2. Blindagem de Estilo (CSS Layer)
- Implementar regra no `src/styles.css` para esconder qualquer elemento que contenha apenas o caractere `\u2063`.

### 3. Saneamento de Componentes Críticos
- Revisar `src/components/SocialProofPopup.tsx` para garantir a higienização de strings dinâmicas.

## Como Validar
- Executar `npm run build` para garantir a integridade do bundle.
- Verificar via console do navegador se o caractere `\u2063` ainda é detectável após a carga de scripts externos.
