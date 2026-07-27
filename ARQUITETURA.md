# EliteBoost Prime — Arquitetura & Regras Mestras

> Índice único. Qualquer IA (Lovable, Cursor, Claude, ChatGPT) que tocar
> este código DEVE ler os arquivos referenciados abaixo ANTES de editar.
> **Regra zero: o código vence o documento.** Se houver divergência,
> corrigir o documento no mesmo turno.

## Documentos Vinculantes (ordem de precedência)

1. **[.lovable/developer_memory.md](.lovable/developer_memory.md)** — Leis de
   engenharia (dinheiro em Decimal, ledger imutável, idempotência MP, HUD
   read-only, zero fabricação, zero achismo, gate de testes).
2. **[.lovable/finance_rules.md](.lovable/finance_rules.md)** — Livro-razão.
   Constantes de margem, fórmula tiered, fail-closed em divergência > R$ 0,01.
3. **[.lovable/manager_agent.md](.lovable/manager_agent.md)** — Gerente Geral.
   4 fornecedores, crons de sync, roteamento de menor custo, quarentena.
4. **[system-architecture.md](system-architecture.md)** — Mapa de rotas e
   isolamento por rede.
5. **[.lovable/memory/index.md](.lovable/memory/index.md)** — Memória viva
   (preferências, regras de negócio, protocolo de trabalho).

## Constantes Cravadas

```
PROFIT_MULT   = 5.0     // base — piso reconhecido pelo trigger DB
tierFactor(q) = 1.0 se q ≤ 500      → 5.0x  (isca)
              = 1.6 se q ≤ 10.000   → 8.0x  (varejo)
              = 2.4 se q > 10.000   → 12.0x (premium)
COUPON_BUFFER = 1.15    // absorve cupom PRIME15
PIX_NET       = 0.9901  // líquido pós taxa % MP Pix
PIX_FIXED     = 0.49    // taxa fixa MP Pix por transação (BRL)
FLOOR_BRL     = 5.00    // piso absoluto (escalonado até ~R$13 em qty 500)
```

Fonte única no código: `src/lib/margin-guardian.ts`.
Camadas defensivas: cliente (`margin-guardian.ts`, `profit-markup.ts`),
server (`pricing-engine.server.ts`, `pricing-config.server.ts`), banco
(trigger `enforce_pricing_markup`).

## Nunca Fazer (Regras Duras)

- ❌ Alterar autenticação sem pedido explícito.
- ❌ Remover coluna de ID de fornecedor (`*_auto_id`, `*_service_id`).
- ❌ Modificar Pix / webhook MP sem teste de idempotência acompanhando.
- ❌ `DELETE` em `financial_ledger` (bloqueado por trigger).
- ❌ Alterar `BrandHeader`, `max-w-md` do checkout, `PixCountdown`.
- ❌ Baixar `PROFIT_MULT` abaixo de 5.0.
- ❌ Desligar cron de sync (`sync-pricing`, `sync-services`, `sync-smmpanel`,
  `sync-verified`, `sync-provider4`).
- ❌ Cravar service ID de fornecedor em código ou documento.
- ❌ Remover o gate `vitest run` para destravar deploy.

## Fluxo Financeiro (canônico)

```
Cliente clica Gerar Pix
  → criarPedido() valida preço = pricing_items.price_brl (RLS)
  → snapshot valor_brl no pedido (sticky, imutável)
  → MP cria preference, cliente paga
  → webhook mp-webhook (assinatura verificada, idempotente por UNIQUE)
  → smart-routing: pickCheapestFornecedorSlug (cost_brl ASC)
  → dispatch ao fornecedor (claim distribuído, anti dupla-entrega)
  → financial_ledger: +pix, -taxa_MP, -custo_fornecedor
  → |Δ| > 0,01 vs virtual_wallets → contingency_hold
```

## Sync em Tempo Real (4 fornecedores)

`smmhype`, `smmpainel`, `verified`, `provider4` — cada um com cron próprio
alimentando `*_services_cache` / `provider_rates_cache`. Master `sync-pricing`
lê todos, aplica a fórmula e upserta `pricing_items`. Vitrine re-hidrata via
`useDynamicPlans`.

## Vigilância Automática

`delivery-watcher`, `sla-watcher`, `drop-watcher`, `pedido-reconciler`,
`reconciliation`, `auto-healer`, `ops-audit`, `smoke-test`, `canary` —
hooks em `src/routes/api/public/hooks/*`, autenticados por
`src/lib/cron-auth.server.ts`.

Regras de cron (v293, obrigatórias em qualquer job novo):
- Token SEMPRE via `vault.decrypted_secrets` (`CRON_ADMIN_TOKEN`). Nunca
  literal no `command` — `cron.job` é legível por quem lê o banco.
- SEMPRE `timeout_milliseconds := 55000`. O padrão do `pg_net` é 5s e
  descarta a resposta de qualquer hook mais lento.
- URL SEMPRE a estável do projeto (`project--<id>.lovable.app`), nunca o
  domínio custom — DNS/SSL do domínio não pode ser ponto único de falha.
- `net.http_post` é fire-and-forget: `cron.job_run_details` marca
  "succeeded" mesmo com hook em 500. A verdade está em
  `net._http_response`, lida pelo job `vigia-robos` (`public.vigia_robos()`,
  a cada 30 min) que abre alerta em português com dedupe de 2h e fecha
  sozinho quando normaliza.

## Modo Shadow (teste sem gastar)

```js
localStorage.setItem('ADMIN_SHADOW','1')   // ativar
localStorage.removeItem('ADMIN_SHADOW')    // desativar
```

## Checklist Pré-Commit

1. Reli o arquivo alvo inteiro antes de modificar.
2. A mudança não viola nenhuma "Regra Dura".
3. Se toca dinheiro: constantes intactas, ledger preservado.
4. Migração DB acompanhada de GRANT + RLS.
5. Documento vinculante atualizado se o comportamento mudou.
6. `tsgo` + `vitest run` verdes.
