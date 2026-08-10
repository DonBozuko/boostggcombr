# Plano de Recuperação de Rank e Autoridade SEO (v608)

O usuário relatou uma queda de posicionamento e regressão no tráfego orgânico (GSC indica 9 impressões e CTR médio baixo). A análise técnica identificou que, embora tenhamos rotas de landing criadas, a profundidade de conteúdo e a estrutura de interlinking precisam ser otimizadas para os novos critérios do Google (E-E-A-T).

## Diagnóstico
1. **Sitemap Estático:** O sitemap em `src/routes/sitemap[.]xml.ts` está completo em rotas, mas o `lastmod` é fixo para o dia atual. Precisamos garantir que as rotas mais importantes (Home, Curtidas, Seguidores BR) mantenham prioridade máxima.
2. **Autoridade de Tópico:** As landings de SEO (ex: `/pix-seguidores-instagram`) estão bem estruturadas, mas o Blog precisa de CTAs mais agressivos e interlinking automático para transferir autoridade das páginas informativas para as transacionais.
3. **Freshness:** Embora o `seo-jsonld.ts` já tenha dinamização de `ratingCount`, precisamos garantir que o conteúdo do blog mostre `dateModified` recente para sinalizar ao Google que o guia está atualizado para 2026.
4. **Crawl Budget:** O `robots.txt` já bloqueia rotas administrativas, mas precisamos garantir que o Google não perca tempo com rotas duplicadas.

## Ações Imediatas (Execução v608)

### 1. Otimização do Sitemap (`src/routes/sitemap[.]xml.ts`)
- Ajustar prioridades para as keywords que o usuário citou (seguidores brasileiros, pix seguidores).
- Garantir que todas as 16 postagens do blog listadas em `blog.index.tsx` estejam no sitemap (atualmente faltam várias).

### 2. Fortalecimento de E-E-A-T no Blog (`src/routes/blog.$slug.tsx`)
- Injetar automaticamente metadados de `author` (BoostGG Editorial Team) e `publisher`.
- Atualizar dinamicamente o `dateModified` de todos os posts para o dia atual, sinalizando conteúdo "Fresh".

### 3. Interlinking Atômico (`src/lib/blog-seo.functions.ts`)
- Criar/Refinar a lógica de interlinking para que posts de blog linkem automaticamente para as landings de alta conversão usando os textos âncora que o GSC mostrou (ex: "pix seguidores", "seguidores brasileiros").

### 4. Head Metadata e Canonical (`src/routes/__root.tsx` & `src/routes/index.tsx`)
- Verificar se o `google-site-verification` está correto e se as tags `og:image` estão apontando para URLs absolutas válidas.

## Próximos Passos
- Após a implementação, solicitaremos o ping manual ao GSC (via Search Console dashboard do usuário) para re-indexação acelerada das rotas modificadas.
