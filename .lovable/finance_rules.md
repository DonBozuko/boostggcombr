# EliteBoost Prime — Finance Rules

> Livro-razão do Agente Contábil. Validador cego de fluxo de caixa.
> Qualquer server function que toque dinheiro deve honrar estas regras.
> **Fonte de verdade do código:** `src/lib/margin-guardian.ts`.
> Se este arquivo divergir do código, o CÓDIGO vence e este arquivo deve
> ser corrigido no mesmo turno.

## Constantes (idênticas a `src/lib/margin-guardian.ts`)

```
PROFIT_MULT   = 5.0     // base (piso reconhecido pelo trigger enforce_pricing_markup)
COUPON_BUFFER = 1.15    // absorve cupom PRIME15
PIX_NET       = 0.9901  // líquido após taxa % MP Pix
PIX_FIXED     = 0.49    // taxa fixa MP Pix por transação
FLOOR_BRL     = 5.00    // piso absoluto por pacote
```

Multiplicador efetivo por faixa (`tierFactor`):

```
qty ≤ 500      → 1.0  →  5.0x   (isca)
qty ≤ 10.000   → 1.6  →  8.0x   (varejo)
qty > 10.000   → 2.4  → 12.0x   (premium)
```

Fórmula de venda:
`price = max(floorFor(qty), (cost × 5.0 × tierFactor(qty) + 0.49) × 1.15 / 0.9901)`

`floorFor(qty)` é escalonado: R$ 5,00 até qty 50, subindo até R$ 13,00 em
qty 500 (ver `margin-guardian.ts`). Nunca abaixo de `FLOOR_BRL`.

## Equação canônica de balanço

```
saldo_final = saldo_inicial + pix_recebido - taxa_gateway - custo_fornecedor
lucro_liquido = pix_recebido - taxa_efetiva_MP - custo_fornecedor
```

`custo_fornecedor` = `Math.min(cost_brl)` do picker cheapest entre os
fornecedores elegíveis (ativo, saldo > 0, service_id presente, não em
quarentena/`unstable`).

## Pagamento com cartão

Checkout Pro do MP, taxa de 7% repassada ao cliente, teto R$ 300, sem
parcelamento. Promoções são Pix-only. Regra vive em `src/lib/card-pricing.ts`.

## Regra de bloqueio automático (Fail-Closed)

```
if abs(saldo_esperado - saldo_real) > 0.01_BRL:
    pedido.status = 'contingency_hold'
    enfileirar em waiting_provision_queue com motivo='ledger_mismatch'
    notifyAdminProvisioning({ motivo: 'AUDITORIA — divergência R$ X,XX' })
    ABORTAR despacho ao fornecedor
```

Sem exceções: nenhum despacho, nenhum débito, nenhuma confirmação ao
cliente até auditoria humana zerar a divergência via linha compensatória
em `financial_ledger`.

## Regras acessórias

- **Precisão:** cálculo intermediário com 4 casas; arredondamento apenas
  na gravação final (2 casas).
- **Ordem de débito:** taxa gateway ANTES do custo fornecedor. Nunca invertida.
- **Cupom PRIME15:** compensado pelo `COUPON_BUFFER`, nunca abatido do custo.
- **Reembolso MP:** linha `type='refund'` em `financial_ledger` com sinal
  invertido; jamais deletar a linha original de venda.
- **Cancel-then-Refund:** cancelar no fornecedor antes de estornar no MP.
  Nunca estornar com pedido ainda em entrega.
- **Idempotência:** duplo webhook MP com mesmo `mercado_pago_id` → no-op
  silencioso, sem segundo débito.
- **Câmbio:** custo de fornecedor em USD é convertido para BRL no sync;
  ajuste > 50% aciona Shock Brake (trava manual).
