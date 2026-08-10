# Plano de Blindagem Arquitetônica e Evolução SEO (v606)

O sistema apresenta sintomas de injeção externa persistente (U+2063) e uma arquitetura de SEO que, embora funcional, carece de proatividade algorítmica. Este plano foca na transição de "auditoria reativa" para "blindagem ativa".

## Diagnóstico Técnico
1.  **DOM Pollution (U+2063):** A persistência desse caractere sugere que a sanitização atual é insuficiente contra scripts de terceiros que reinjetam elementos após a hidratação do React. O `MutationObserver` atual é muito permissivo.
2.  **SEO Drift:** A queda de impressões no GSC indica que a autoridade do domínio está sendo diluída. O interlinking manual é ineficiente em escala. Precisamos de um motor que entenda o grafo de conteúdo.
3.  **Gargalo de Transação:** O timeout de preflight (12s) é um paliativo. Precisamos de resiliência real contra falhas intermitentes de rede do gateway.

## Ações de Implementação

### 1. Blindagem Total de DOM (Antidote Pro)
- Refatorar o `MutationObserver` em `src/routes/__root.tsx` para ser recursivo e atuar com prioridade de microtask.
- Implementar a remoção agressiva de `\u2063`, `\u200B` e `\uFEFF` (BOM) em qualquer profundidade da árvore, focando em elementos `span` injetados dinamicamente.
- Adicionar regra CSS em `src/styles.css` para forçar `display: none` em elementos que contenham apenas caracteres de controle.

### 2. Motor de Autoridade Algorítmica (Auto-Interlink v2)
- Evoluir `src/lib/blog-seo.functions.ts` para um parser dinâmico que escaneia o conteúdo dos posts do blog e injeta links contextuais baseados em densidade de palavras-chave.
- Implementar cache de fragmentos de SEO para evitar sobrecarga no SSR (TanStack Start).

### 3. Otimização de Pipeline de Pagamento (Retry Atômico)
- Implementar mecanismo de "Silent Retry" em `src/lib/pedidos.functions.ts`. Se o preflight falhar, o sistema tentará uma segunda vez imediatamente antes de abortar a transação.

### 4. Freshness Matrix & E-E-A-T
- Atualizar a lógica de `lastmod` no sitemap para refletir mudanças de preço e disponibilidade em tempo real.
- Refinar a marcação JSON-LD em `src/lib/seo-jsonld.ts` para incluir `BreadcrumbList` e `FAQPage` estruturados.

## Detalhes Técnicos para Revisão
- **Localização do Sanitizador:** `src/routes/__root.tsx`
- **Lógica de Interlinking:** `src/lib/blog-seo.functions.ts`
- **Fluxo de Checkout:** `src/lib/pedidos.functions.ts`
- **Sitemap Dinâmico:** `src/routes/sitemap[.]xml.ts`

## Confronto de Pontos Cegos
- **RLS Bypass:** Estamos abusando do `supabaseAdmin` para bypass de RLS no ledger financeiro. Qual o plano de contingência se uma server function for sequestrada por injeção de payload?
- **Arbitragem Madrugada:** O "Modo Noturno" economiza recursos, mas cria uma janela de exposição a variações de custo do fornecedor. Como garantimos a integridade da margem sem pings de segurança reais?
