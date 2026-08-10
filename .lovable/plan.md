# Plano de Blindagem Arquitetônica e Evolução SEO (v606)

O sistema apresenta sintomas de injeção externa persistente (U+2063) e uma arquitetura de SEO que, embora funcional, carece de proatividade algorítmica. Este plano foca na transição de "auditoria reativa" para "blindagem ativa".

## Diagnóstico Técnico
1.  **DOM Pollution (U+2063):** A persistência desse caractere sugere que a sanitização atual é insuficiente contra scripts de terceiros que reinjetam elementos após a hidratação do React.
2.  **SEO Drift:** A queda de impressões no GSC indica que a autoridade do domínio está sendo diluída. O interlinking manual é ineficiente em escala.
3.  **Gargalo de Transação:** O timeout de preflight, embora aumentado, ainda é vulnerável a variações de latência do gateway de pagamento (Mercado Pago).

## Ações de Implementação

### 1. Blindagem Total de DOM (Antidote Pro)
- Refatorar o `MutationObserver` em `src/routes/__root.tsx` para ser recursivo e atuar com prioridade de microtask, garantindo a remoção instantânea de `\u2063`, `\u200B` e outros caracteres de controle em qualquer profundidade da árvore.
- Adicionar uma regra CSS global agressiva para colapsar qualquer elemento que contenha apenas caracteres invisíveis.

### 2. Motor de Autoridade Algorítmica (Auto-Interlink v2)
- Evoluir `src/lib/blog-seo.functions.ts` para um parser dinâmico. O sistema passará a escanear o conteúdo dos posts do blog em tempo de renderização e injetar links contextuais automaticamente para as rotas de alta conversão.
- Implementar cache de fragmentos de SEO para evitar sobrecarga no SSR.

### 3. Otimização de Pipeline de Pagamento
- Implementar um mecanismo de "Pre-auth Lock" em `src/lib/pedidos.functions.ts`. Em vez de apenas aumentar o timeout, o sistema fará um retry silencioso de baixa latência caso o primeiro preflight falhe por rede, reduzindo a taxa de abandono no checkout.

### 4. Freshness Matrix & E-E-A-T
- Atualizar a lógica de `lastmod` no sitemap para refletir mudanças de preço e disponibilidade em tempo real, sinalizando ao Google que o conteúdo é "vivo".
- Refinar a marcação JSON-LD em `src/lib/seo-jsonld.ts` para incluir `BreadcrumbList` em todas as rotas profundas, melhorando a visibilidade nos SERPs.

## Detalhes Técnicos para Revisão
- **Localização do Sanitizador:** `src/routes/__root.tsx`
- **Lógica de Interlinking:** `src/lib/blog-seo.functions.ts` e `src/routes/blog.$slug.tsx`
- **Fluxo de Checkout:** `src/lib/pedidos.functions.ts`
- **Sitemap Dinâmico:** `src/routes/sitemap[.]xml.ts`

## Confronto de Pontos Cegos
- A arquitetura atual depende fortemente do `supabaseAdmin` para bypass de RLS em funções críticas. Até que ponto estamos expondo o ledger financeiro a falhas de lógica em server functions que não possuem validação de schema rígida o suficiente?
- O "Modo Noturno" de sincronismo de preços pode criar uma janela de arbitragem se os fornecedores alterarem preços drasticamente durante a madrugada. Como garantiremos que a margem mínima nunca seja violada nesse período sem um ping de segurança?
