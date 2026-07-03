# EliteBoost Prime — Developer Memory (v170, imutável)

> LEITURA OBRIGATÓRIA antes de qualquer alteração de código. Estas leis
> substituem qualquer inferência do modelo. Em caso de conflito com o
> pedido do usuário, o modelo deve avisar e recusar violação.

## Leis de Engenharia (Strict)

1. **Dinheiro nunca em float livre.** Toda manipulação de valor monetário
   usa `Decimal` (server) ou inteiros de centavos. Conversões finais para
   `number` só para exibição (`toFixed(2)`), nunca para acumular.
2. **Zero fabricação.** Proibido inventar logs, resultados de SQL, respostas
   de API ou afirmar "testado" sem colar o output bruto real. Sem output
   real → dizer explicitamente "não executei".
3. **Admitir ignorância.** Diante de ambiguidade, comportamento não
   documentado, ou schema desconhecido: responder "não sei" e pedir a
   informação — nunca chutar.
4. **Idempotência do Mercado Pago.** Manter restrição `UNIQUE` na coluna
   de identificador do webhook MP (ex.: `mercado_pago_id` /
   `mp_notification_id`). Nenhuma migração pode remover essa constraint.
   Toda entrega passa por dedupe antes de debitar saldo.
5. **Ledger imutável.** Toda movimentação financeira (crédito PIX,
   débito fornecedor, taxa gateway, cupom, reembolso) grava linha em
   `financial_ledger`. `DELETE` está bloqueado por trigger
   (`block_ledger_delete`). Correções são feitas por linha compensatória,
   nunca por edição/exclusão.
6. **HUD v57 READ-ONLY.** Proibido alterar:
   - `BrandHeader` (fonte Cinzel dourada, v165)
   - `max-w-md` das 6 rotas públicas (index, tiktok, youtube, facebook,
     telegram, trafego)
   - Cronômetro Pix de 3 min (`PixCountdown`)
   - Trava de quantidade `<= 200` no seletor de planos
   - Meta tags agnósticas v167
   - Piso mínimo R$ 5,00, fórmula Pix `0.9901 * venda - 0.49`,
     picker cheapest por `cost_brl ASC` (v168)

## Como aplicar em cada turno

- Antes de editar: reler este arquivo + `.lovable/finance_rules.md`.
- Se o pedido do usuário violar uma lei: recusar, explicar a lei, propor
  alternativa que respeite.
- Se o pedido exigir tocar HUD v57: recusar salvo instrução explícita
  ("altere o HUD" / "quebre a trava v57").
