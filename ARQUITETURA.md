# EliteBoost Prime — Arquitetura & Regras Mestras

> Índice único. Qualquer IA (Lovable, Cursor, Claude, ChatGPT) que tocar
> este código DEVE ler os 3 arquivos referenciados abaixo ANTES de editar.
> Em conflito com pedido do usuário: avisar e recusar violação.

## Documentos Vinculantes (ordem de precedência)

1. **[.lovable/developer_memory.md](.lovable/developer_memory.md)** — Leis
   de engenharia (dinheiro em Decimal, ledger imutável, idempotência MP,
   HUD v57 read-only, zero fabricação).
2. **[.lovable/finance_rules.md](.lovable/finance_rules.md)** — Livro-razão
   contábil. Equação Fabiano, constantes trava-margem, fail-closed em
   divergência > R$ 0,01.
3. **[.lovable/manager_agent.md](.lovable/manager_agent.md)** — Gerente
   Geral. Governa 3 fornecedores (smmhype/smmpainel/verified), cron de
   sync, roteamento de menor custo, blindagem visual.

## Constantes Cravadas (v173 — Tiered)

```
PROFIT_MULT   = 5.0     // base — piso reconhecido pelo trigger DB
tierFactor(q) = 1.0 se q ≤ 500      → 5.0x  (isca)
              = 1.6 se q ≤ 10.000   → 8.0x  (varejo)
              = 2.4 se q > 10.000   → 12.0x (premium)
COUPON_BUFFER = 1.15    // absorve cupom PRIME15 (preservado)
PIX_NET       = 0.9901  // líquido pós taxa % MP Pix
PIX_FIXED     = 0.49    // taxa fixa MP Pix por transação (BRL)
FLOOR_BRL     = 5.00    // piso absoluto por pacote
```

Fórmula de venda:
`price = max(floor(qty), (cost × 5.0 × tierFactor(qty) × 1.15 + 0.49) / 0.9901)`

Aplicada em 3 camadas defensivas:
- Cliente: `src/lib/margin-guardian.ts`, `src/lib/profit-markup.ts`
- Server: `src/lib/pricing-engine.server.ts`, `src/lib/pricing-config.server.ts`
- Banco: trigger `enforce_pricing_markup` em `pricing_items`

## Nunca Fazer (Regras Duras)

- ❌ Alterar autenticação sem pedido explícito.
- ❌ Remover coluna de ID de fornecedor (`smmhype_service_id`,
  `smmpanel_service_id`, `verified_service_id`).
- ❌ Modificar integração Pix / webhook MP sem migração acompanhada de
  teste de idempotência.
- ❌ `DELETE` em `financial_ledger` (bloqueado por trigger).
- ❌ Alterar `BrandHeader`, `max-w-md`, `PixCountdown`, trava qty ≤ 200.
- ❌ Baixar `PROFIT_MULT` abaixo de 5.0.
- ❌ Desligar cron de sync (`sync-pricing`, `sync-services`,
  `sync-smmpanel`, `sync-verified`).

## Fluxo Financeiro (canônico)

```
Cliente clica Gerar Pix
  → criarPedido() valida preço = pricing_items.price_brl (RLS)
  → snapshot valor_brl no pedido (sticky, imutável)
  → MP cria preference, cliente paga
  → webhook mp-webhook (idempotente por mercado_pago_id UNIQUE)
  → smart-routing: pickCheapestFornecedorSlug (cost_brl ASC)
  → dispatch API fornecedor
  → financial_ledger: +pix, -taxa_MP, -custo_fornecedor
  → saldo_esperado vs virtual_wallets: |Δ| > 0,01 → contingency_hold
```

## Sync em Tempo Real (3 fornecedores)

Cada fornecedor tem cron independente atualizando
`provider_rates_cache` (particionado por `provider_slug`):

- `smmhype`  → `/api/public/sync-services` (60s)
- `smmpanel` → `/api/public/sync-smmpanel` (60s)
- `verified` → `/api/public/sync-verified` (60s)

Master `sync-pricing` (15s) lê os 3, aplica fórmula, upserta
`pricing_items`. Vitrine re-hidrata a cada 15s (`useDynamicPlans`).

## Modo Shadow (teste sem gastar)

```js
// Ativar (console do navegador, após login admin)
localStorage.setItem('ADMIN_SHADOW','1')
// Desativar
localStorage.removeItem('ADMIN_SHADOW')
```

Executa `simulatePurchase` (dry-run) em vez de MP real. Zero débito.

## Ao Editar (Checklist Pré-Commit)

1. Reli o arquivo alvo inteiro antes de modificar.
2. A mudança não viola nenhuma das "Regras Duras" acima.
3. Se toca dinheiro: constantes intactas, ledger preservado.
4. Se toca UI pública: HUD v57 não alterado.
5. Migração DB acompanhada de GRANT + RLS.
6. Escopo mínimo: um arquivo por intenção, sem "refatorar de brinde".

---

`ELITEBOOST PRIME — v173 · Tiered Strict Margin (5x/8x/12x + PRIME15 buffer)`
