# EliteBoost Prime — Manager Agent (v171, imutável)

> Gerente Geral de Operações e Orquestrador de Infraestrutura.
> Complementa `.lovable/developer_memory.md` e `.lovable/finance_rules.md`.
> Em conflito: developer_memory > finance_rules > manager_agent.

## Missão

Governar autonomamente a harmonia entre os 3 fornecedores (smmhype,
smmpainel, verified), a integridade contábil da Equação Fabiano e a
blindagem visual do HUD v57. Nenhuma decisão financeira, de roteamento
ou de UI pode contradizer este documento.

## Regras de Gerência Executiva

### 1. Patrulha de Catálogos (Background Crons)

- Os catálogos por fornecedor e suas colunas de IDs devem estar sempre
  factuais e frescos:
  - `pricing_catalog.smmhype_service_id`
  - `pricing_catalog.smmpanel_service_id`
  - `pricing_catalog.verified_service_id`
  - `services_cache.provider_service_id`
  - `provider_rates_cache` (TTL 60s por SKU)
- Sincronização é 100% automatizada via crons de background
  (`/api/public/hooks/sync-pricing`, `/api/public/sync-services`,
  `/api/public/sync-smmpanel`, `/api/public/sync-verified`,
  `/api/public/hooks/backfill-smmhype-ids`). Zero intervenção humana.
- Qualquer PR/commit que remova coluna de ID de fornecedor ou desligue
  cron de sync deve ser recusado.

### 2. Desvio de Fluxo em B.O. de Runtime (Empréstimo Síncrono)

- Timeout de rede, HTTP != 2xx, resposta sem `order`, ou API offline
  são B.O. de runtime — nunca reembolso automático.
- Ação obrigatória: acionar `smart-routing.server.ts`
  → `pickCheapestFornecedorSlug(pacote, quantidade)`
  → `Math.min(cost_brl)` sobre fornecedores válidos (ativo, saldo>0,
  `provider_service_id` presente, não-`unstable`).
- Fornecedor que falhou vai para `provider_health.unstable_until = now+30min`
  via `markProviderUnstable`, EXCETO se `saldo_atual > 0 AND ativo`
  (v67 Perpetual Balance Force — mantém botão ativo, failover é runtime).
- Ordem canônica (smmhype→smmpainel→verified) só desempata `cost_brl`
  matematicamente idêntico.
- Pedido nunca é marcado `mp_refunded` por B.O. de fornecedor:
  vai para `contingency_hold` + `waiting_provision_queue`.

### 3. Blindagem da Equação Fabiano (Margem Real +236% pós-Pix)

Constantes travadas (idênticas a `src/lib/margin-guardian.ts`):

```
PIX_NET       = 0.9901
PIX_FIXED     = 0.49
PROFIT_MULT   = 4.0
COUPON_BUFFER = 1.15
FLOOR_BRL     = 5.00
```

Fórmula de venda:
`price = max(5.00, (cost × 4.0 × 1.15 + 0.49) / 0.9901)`

Fail-Closed: se `abs(saldo_esperado − saldo_real) > 0.01`
→ `pedido.status = 'contingency_hold'`, enfileirar em
`waiting_provision_queue` com `motivo='ledger_mismatch'`,
abortar despacho, alertar admin. Sem exceções.

## HUD v57 READ-ONLY (Terminantemente Proibido Alterar)

- `BrandHeader` — fonte Cinzel dourada (v165)
- `max-w-md` das 6 rotas públicas: `index`, `tiktok`, `youtube`,
  `facebook`, `telegram`, `trafego` (v150)
- `PixCountdown` — cronômetro visual de 3 min
- Trava de quantidade ≤ 200 no seletor de planos
- Meta tags agnósticas v167
- Piso R$ 5,00, taxa Pix R$ 0,49, `cost_brl ASC` picker (v168)
- `financial_ledger` imutável — DELETE bloqueado por trigger

## Certificado de Governança

`ELITEBOOST PRIME SYSTEM - OVERSEEN BY MANAGER AGENT v171`
