# EliteBoost Prime — Manager Agent

> Gerente Geral de Operações e Orquestrador de Infraestrutura.
> Complementa `.lovable/developer_memory.md` e `.lovable/finance_rules.md`.
> Em conflito: **código real > developer_memory > finance_rules > manager_agent**.

## Missão

Governar a harmonia entre os fornecedores ativos, a integridade contábil
e a blindagem visual do HUD. Nenhuma decisão financeira, de roteamento ou
de UI pode contradizer este documento sem correção explícita dele.

## 1. Fornecedores (4 slugs)

| slug | coluna de ID | cron de sync |
|---|---|---|
| `smmhype`  | `smmhype_auto_id`  | `/api/public/sync-services` |
| `smmpainel` (colunas `smmpanel_*`) | `smmpanel_auto_id` | `/api/public/sync-smmpanel` |
| `verified` | `verified_auto_id` | `/api/public/sync-verified` |
| `provider4` | `provider4_auto_id` | `/api/public/sync-provider4` |

Master `sync-pricing` lê os caches, aplica a fórmula e upserta `pricing_items`.

**Regra de sync (absoluta):** catálogo do fornecedor é sempre sincronizado
COMPLETO para tabela em banco, com job automático e detector de variantes
que popula `service_id_matrix`. Se precisar preencher ID à mão, o sync está
incompleto — arruma o sync, não o valor.

Qualquer mudança que remova coluna de ID de fornecedor ou desligue cron de
sync deve ser recusada.

## 2. Desvio de fluxo em B.O. de runtime

- Timeout, HTTP != 2xx, resposta sem `order`, API offline = B.O. de runtime.
  **Nunca reembolso automático.**
- Ação: `smart-routing.server.ts` → `pickCheapestFornecedorSlug(pacote, qty)`
  → `Math.min(cost_brl)` entre fornecedores válidos.
- Fornecedor que falha entra em `provider_health.unstable_until` e, no
  canário, em `canary_quarantine` (exponencial, por pacote+fornecedor).
  Quarentena de um pacote **não** derruba a venda pelos outros.
- Pedido nunca vira `mp_refunded` por B.O. de fornecedor: vai para
  `contingency_hold` + `waiting_provision_queue`.
- Retry com backoff exponencial vive em `src/lib/retry-policy.ts`.

## 3. Vendabilidade e origem

- Pacote só é vendável se tiver service_id resolvido, fornecedor com saldo
  e passar no dry-run. Sem isso, some da vitrine — nunca fica fantasma.
- Pacote `:br` nunca aponta para serviço internacional nem para serviço
  marcado como queda.
- Selo de origem (🇧🇷 Brasileiro Real / 🌎 Global) é derivado do serviço
  real, nunca hardcoded.

## 4. Blindagem de margem

Constantes e fórmula: ver `.lovable/finance_rules.md` (ponto único de verdade).
Camadas defensivas: cliente (`margin-guardian.ts`, `profit-markup.ts`),
server (`pricing-engine.server.ts`, `pricing-config.server.ts`) e banco
(trigger `enforce_pricing_markup`). Reajuste automático até +40%; acima
disso, trava manual.

## 5. Alertas

Todo alerta nasce com dedupe + cooldown + resolução automática + quarentena.
Alerta repetido sem novidade é defeito nosso. Texto sempre em português
direto: título + "PROBLEMA:" + "O QUE FAZER:".

## HUD READ-ONLY (proibido alterar sem pedido explícito)

- `BrandHeader` (fonte Cinzel dourada)
- `max-w-md` do container das rotas públicas de checkout
- `PixCountdown` — cronômetro de 3 min
- `financial_ledger` imutável — DELETE bloqueado por trigger
