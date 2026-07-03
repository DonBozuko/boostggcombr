# EliteBoost Prime — Finance Rules (v170)

> Livro-razão do Agente Contábil. Validador cego de fluxo de caixa.
> Qualquer server function que toque dinheiro deve honrar estas regras.

## Equação canônica de balanço (Strict Margin Guard v168)

Para cada pedido pago, o processador contábil deve resolver:

```
saldo_final = saldo_inicial
            + pix_recebido                                 -- valor bruto MP
            - taxa_gateway                                 -- venda * 0.9901 aplicada + R$ 0.49 fixo
            - custo_fornecedor                             -- Math.min(cost_brl ASC) do picker cheapest
lucro_liquido = pix_recebido
              - (venda - (venda * 0.9901 - 0.49))          -- taxa efetiva MP Pix
              - custo_fornecedor
```

Constantes obrigatórias (idênticas a `src/lib/margin-guardian.ts`):

- `PIX_NET       = 0.9901`
- `PIX_FIXED     = 0.49`
- `PROFIT_MULT   = 4.0`
- `COUPON_BUFFER = 1.15`
- `FLOOR_BRL     = 5.00`

## Regra de bloqueio automático (Fail-Closed)

Diferença absoluta permitida entre processador contábil e
`virtual_wallets` / `fornecedores.saldo_atual`: **R$ 0,00**.

```
if abs(saldo_esperado - saldo_real) > 0.01_BRL:
    pedido.status = 'contingency_hold'
    enfileirar em waiting_provision_queue com motivo='ledger_mismatch'
    notifyAdminProvisioning({ motivo: 'AUDITORIA — divergência R$ X,XX' })
    ABORTAR despacho ao fornecedor
```

Sem exceções: nenhum despacho, nenhum débito, nenhuma confirmação ao
cliente até que a auditoria humana zere a divergência via linha
compensatória em `financial_ledger`.

## Regras acessórias

- **Precisão:** todo cálculo intermediário em `Decimal` com 4 casas;
  arredondamento apenas na gravação final (2 casas, `ROUND_HALF_EVEN`).
- **Ordem de débito:** taxa gateway ANTES do custo fornecedor. Nunca
  invertida.
- **Cupom PRIME15:** compensado pelo `COUPON_BUFFER = 1.15` no preço de
  venda, nunca abatido do custo do fornecedor.
- **Reembolso MP:** gera linha `type='refund'` em `financial_ledger`
  com sinal invertido; jamais deletar a linha original de venda.
- **Idempotência:** duplo webhook MP com mesmo `mercado_pago_id` →
  no-op silencioso, sem segundo débito.
