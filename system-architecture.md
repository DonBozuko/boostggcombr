# System Architecture — EliteBoost Prime

Isolamento por rota. **Nenhum service ID de fornecedor é fixado neste
documento** — IDs mudam sozinhos e são resolvidos em runtime a partir de
`pricing_items` / `*_services_cache` / `service_id_matrix`. Se algum
documento citar um ID cravado, ele está errado.

## Admin — `/admin`

Painel único (`src/routes/admin.tsx`). Saldo de todos os fornecedores,
crons, dispatcher, pedidos, canário, Jarvis, tesouraria, revenda, afiliados.

**Proibido:** vender pacote, expor checkout público, exibir branding de rede
social no header.

## Vitrines públicas (uma rota por rede)

| Rota | Rede | `rede_social` | prefixo de pacote |
|---|---|---|---|
| `/` | Instagram | `instagram` | `i*` |
| `/tiktok` | TikTok | `tiktok` | `t*` |
| `/youtube` | YouTube | `youtube` | `y*` |
| `/kwai` | Kwai | `kwai` | `k*` |
| `/facebook` | Facebook | `facebook` | `f*` |
| `/telegram` | Telegram | `telegram` | `tg*` |

Cada rota mantém identidade visual própria e **não** referencia outra rede
(texto, ícone, cor ou pacote). Catálogo de cada rota vem do banco via
`useDynamicPlans` — nunca lista hardcoded.

## Landings de SEO

Rotas de conteúdo (`/comprar-*`, `/seguidores-pix`, `/blog/*`, `/ferramentas/*`)
usam `SeoLanding` + JSON-LD e apontam CTA para a vitrine da rede
correspondente. Cada rota tem `head()` próprio com título e descrição únicos.

## Fluxo do dinheiro (canônico)

```
Gerar Pix → criarPedido() valida preço contra pricing_items (RLS)
  → snapshot valor_brl no pedido (imutável)
  → MP cria preference → cliente paga
  → webhook mp-webhook (idempotente, assinatura verificada)
  → smart-routing: pickCheapestFornecedorSlug (cost_brl ASC)
  → dispatch ao fornecedor (claim distribuído, anti dupla-entrega)
  → financial_ledger: +pix, -taxa MP, -custo fornecedor
  → divergência > R$ 0,01 → contingency_hold
```

## Vigilância automática

`delivery-watcher`, `sla-watcher`, `drop-watcher`, `pedido-reconciler`,
`reconciliation`, `auto-healer`, `ops-audit`, `smoke-test` e `canary` rodam
como hooks em `src/routes/api/public/hooks/*`, todos autenticados por
`src/lib/cron-auth.server.ts`.
