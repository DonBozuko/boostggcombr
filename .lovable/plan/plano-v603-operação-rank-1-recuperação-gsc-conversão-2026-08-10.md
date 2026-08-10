# Plano v603: Operação Rank 1 — Recuperação GSC & Conversão

Este plano endereça os diagnósticos do Google Search Console, focando em recuperar a página de curtidas e capitalizar o crescimento do blog.

## 1. Recuperação de `/comprar-curtidas-instagram` (Sinal de Qualidade)
**Objetivo:** Reverter a queda de 97% nas impressões removendo o aspecto "spam" e reforçando autoridade (E-E-A-T).
- **Arquivo:** `src/routes/comprar-curtidas-instagram.tsx`
- **Alteração:**
    - Refinar `DESC` e `H1` para evitar repetição excessiva de palavras-chave.
    - Adicionar seção "Como o algoritmo lê curtidas em 2026" (Conteúdo Educativo).
    - Atualizar `FAQ` com respostas mais técnicas sobre retenção.

## 2. Monetização do Blog `/blog/como-ganhar-seguidores-instagram`
**Objetivo:** Converter o aumento de 123% de impressões em vendas reais.
- **Arquivo:** `src/routes/blog.$slug.tsx`
- **Alteração:**
    - Injetar componente de `CTA` lateral ou banners entre parágrafos (seção 7).
    - Melhorar a proeminência dos links para `/comprar-seguidores-brasileiros`.

## 3. Higiene de Indexação
**Objetivo:** Resolver as 31 páginas não indexadas e garantir frescor.
- **Arquivo:** `src/routes/sitemap[.]xml.ts`
- **Alteração:**
    - Ajustar `priority` da página de curtidas para `1.0` (estava `0.9`).
    - Garantir que `lastmod` reflita a data da refatoração de hoje.
- **Execução:** Disparar `pingGoogleSitemap` manualmente após o deploy.

## Validação Pós-Implementação
- [ ] Verificar Lighthouse SEO Score (deve ser 100).
- [ ] Validar renderização dos novos CTAs no blog.
- [ ] Confirmar ausência de `noindex` no código da rota de curtidas.
