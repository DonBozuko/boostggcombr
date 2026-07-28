---
name: Moeda única é BRL
description: Todo valor de dinheiro no sistema é BRL. monitoramento_saldo.saldo é USD legado — ler saldo_brl. Nunca comparar número de saldo sem confirmar a moeda.
type: constraint
---
Regra permanente (v347), criada depois de eu ler R$ 27,69 onde o saldo real era
R$ 140,99:

1. **Fonte de verdade do saldo:** `fornecedores.saldo_atual` (BRL) e
   `monitoramento_saldo.saldo_brl` (BRL, gravado com `cotacao_brl` do momento).
2. **`monitoramento_saldo.saldo` é LEGADO em USD.** Nunca usar em relatório,
   alerta ou diagnóstico. Só existe para não perder histórico antigo.
3. Conversão vem de `fornecedores.cotacao_brl` / `moeda`, nunca de regex de slug.
4. Antes de afirmar qualquer número de dinheiro: conferir a coluna e a moeda.
   Sem isso, é achismo.
