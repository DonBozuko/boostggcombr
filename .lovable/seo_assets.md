# Inventário SEO / AEO — BoostGG (Elite Boost Prime)

Fonte única do que existe hoje em busca orgânica. **O código vence o documento**:
se divergir de `src/routes/sitemap[.]xml.ts`, corrigir este arquivo no mesmo turno.

## 1. Ativos publicados (53 URLs no sitemap)

| Bloco | URLs | Papel |
|---|---|---|
| Home + redes | `/`, `/tiktok`, `/youtube`, `/kwai`, `/facebook`, `/telegram` | Catálogo/checkout por rede |
| Dinheiro (bottom funnel) | `/comprar-seguidores-instagram`, `-barato`, `/comprar-seguidores-brasileiros`, `/comprar-curtidas-instagram`, `/comprar-seguidores-tiktok`, `/comprar-visualizacoes-tiktok`, `/comprar-curtidas-tiktok`, `/seguidores-reais-instagram`, `/comprar-inscritos-youtube`, `/comprar-seguidores-kwai`, `/seguidores-pix`, `/promo-5reais`, `/kit-creator` | Conversão direta |
| Intenção/meio de funil | `/audiencia-brasileira`, `/crescer-youtube`, `/engajamento-instagram`, `/impulsionar-instagram`, `/turbinar-tiktok`, `/views-tiktok` | Captura de cauda longa |
| Ferramentas grátis | `/ferramentas` + `contador-seguidores`, `calculadora-engajamento-instagram`, `gerador-legenda-instagram` | Volume de busca + isca de backlink |
| Blog (8 artigos) | `/blog` + 8 slugs | Autoridade tópica |
| Prova/transparência | `/avaliacoes`, `/rastrear`, `/status` | Confiança (E-E-A-T) |
| Parcerias | `/revenda`, `/api-revenda`, `/afiliados` | B2B |
| Institucional | `/termos`, `/privacidade`, `/reembolso` | Compliance/E-E-A-T |

Fora do índice de propósito: `/admin*`, `/painel-*`, `/diagnostico`, `/obrigado`,
`/unsubscribe`, `/trafego`, `/dashboard/seo`.

## 2. Malha de links internos (v300)

- `src/components/RelatedLinks.tsx` — 3 links de saída por landing. **Nenhuma
  landing pode ficar sem entrada aqui** (regra: página órfã = página sem autoridade).
- `src/components/BlogLayout.tsx` — bloco "Continue por aqui" em todo artigo.
- `src/components/TopNetworksNav.tsx` — navegação global entre redes.

## 3. AEO / respostas de IA

- `public/llms.txt` — ficha da marca para LLMs. **Precisa refletir a realidade
  comercial** (métodos de pagamento, redes, garantias). Já corrigido: cartão até
  R$ 300 com 7%, Kwai listado.
- `public/robots.txt` — bots de IA liberados (GPTBot, PerplexityBot, etc.).
- JSON-LD: `src/lib/seo-jsonld.ts` (Product, FAQ, BreadcrumbList, AggregateRating).

## 4. Posição atual (GSC/Semrush, última leitura)

- `pix seguidores` — 11 → **9,6** (subindo).
- `/ferramentas/contador-seguidores` — posição ~34 para termo de 6,6k buscas/mês:
  maior alavanca de tráfego não explorada.

## 5. Lacuna real: autoridade externa

Tudo acima é on-page. O que falta é backlink. Ordem de ataque:

1. **Isca de ferramenta** — contador/calculadora são linkáveis por natureza.
   Divulgar como ferramenta grátis, não como página de venda.
2. **Perfis de marca** — citações consistentes (NAP: nome, CNPJ, site) em
   diretórios BR, Reclame Aqui, redes sociais oficiais, Google Business.
3. **Conteúdo de dados** — publicar números próprios (tempo médio de entrega,
   taxa de reposição) que outros sites possam citar.
4. **Parcerias** — revendedores e afiliados linkando para `/revenda` e `/afiliados`.

Regra: **zero compra de link em PBN**. Risco de penalidade > ganho.
