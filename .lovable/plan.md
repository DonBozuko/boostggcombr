# Protocolo de Auditoria e Recuperação SEO (v619)

Investigação profunda de queda de CTR e posicionamento no GSC.

## Diagnóstico Real
1. **Indexação:** 63 rotas mapeadas. Sitemap v302 funcional em /sitemap.xml (Status 200).
2. **Canonicidade:** Blindagem v616 força 'www' via BrandGuard.tsx. Links em sitemap e JSON-LD sincronizados.
3. **Rich Snippets:** JSON-LD Product em 10+ landings com AggregateRating dinâmico (Freshness v598).
4. **Crawl Budget:** robots.txt v417 protege áreas administrativas e transacionais.
5. **E-E-A-T:** Blog v605 com 16 artigos técnicos. Interlinking automático (v608).

## Riscos Identificados
- **Canibalização:** /seguidores-pix vs /pix-seguidores-instagram vs /comprar-seguidores-instagram-barato. Intenções de busca muito próximas dividindo autoridade.
- **Freshness de Artigos:** Muitos artigos com data de publicação estática em jan/2026.
- **Metadados:** Alguns títulos ultrapassam 60 caracteres (ex: Kit Creator).
- **Conversão (Pix):** Erros database/profile_not_found detectados no print do Jarvis podem estar assustando o bot de renderização do Google (se ocorrerem em SSR).

## Plano de Ação (Aprovação Necessária)
1. **[Baixo Risco] Otimização de Títulos e Metas:** Ajustar para < 60 chars e < 160 chars em rotas críticas.
2. **[Baixo Risco] Freshness Atômica:** Dinamizar 'dateModified' em todos os artigos do blog (hoje apenas um tem).
3. **[Médio Risco] Consolidação de Landings:** Unificar landings fracas em landings fortes para concentrar 'link juice'.
4. **[Alto Risco] Auditoria SSR:** Investigar se erros 'PROFILE_NOT_FOUND' ocorrem durante o rastreio do GoogleBot (pre-render).

