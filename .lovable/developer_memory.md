# EliteBoost Prime — Developer Memory

> LEITURA OBRIGATÓRIA antes de qualquer alteração de código. Estas leis
> substituem qualquer inferência do modelo. Em conflito com o pedido do
> usuário: avisar e recusar violação.
> **Se este arquivo divergir do código, o CÓDIGO vence** — e o arquivo deve
> ser corrigido no mesmo turno.

## Leis de Engenharia (Strict)

1. **Dinheiro nunca em float livre.** Valor monetário em `Decimal` (server)
   ou inteiros de centavos. Conversão para `number` só na exibição.
2. **Zero fabricação.** Proibido inventar logs, resultado de SQL, resposta
   de API ou afirmar "testado" sem output real. Sem output → dizer
   explicitamente "não executei".
3. **Zero achismo.** Toda afirmação técnica exige leitura de código, banco
   ou log ANTES. Se não verificou, dizer "não verifiquei ainda".
4. **Idempotência do Mercado Pago.** Manter `UNIQUE` no identificador do
   webhook MP. Nenhuma migração pode remover essa constraint. Toda entrega
   passa por dedupe antes de debitar saldo. Chaves de idempotência são
   determinísticas.
5. **Ledger imutável.** Toda movimentação grava linha em `financial_ledger`.
   `DELETE` bloqueado por trigger. Correção só por linha compensatória.
6. **Cancel-then-Refund.** Cancelar no fornecedor antes de estornar no MP.
7. **HUD READ-ONLY.** Proibido alterar sem pedido explícito:
   - `BrandHeader` (fonte Cinzel dourada)
   - `max-w-md` do container das rotas públicas de checkout
   - `PixCountdown` (3 min)
   - Piso mínimo escalonado e fórmula de margem (`margin-guardian.ts`)
   - Picker cheapest por `cost_brl ASC`
8. **Nada fake em nenhuma rota.** Sem "em breve", placeholder ou botão
   decorativo. Rótulo de manutenção só ligado a flag real no banco.
9. **Gate de testes.** Build só passa com `vitest run` verde. Fluxo crítico
   novo nasce com teste em `src/__tests__/`. Nunca remover o gate.
10. **Mudança aditiva > refactor arriscado.** Se houver risco de regressão,
    avisar ANTES. Se quebrou, avisar IMEDIATAMENTE no turno seguinte.

11. **Preço tem dono único.** Só `src/lib/price-authority.server.ts` grava
    `price_brl`. Qualquer outro motor grava apenas custo/IDs. Teste
    `price-single-writer` barra o deploy se surgir um segundo escritor.

## Como aplicar em cada turno

- Antes de editar: reler este arquivo + `.lovable/finance_rules.md` +
  `.lovable/manager_agent.md`.
- Se o pedido violar uma lei: recusar, explicar, propor alternativa.
- Ao terminar: varredura de lixo (arquivo/dep órfão) + `tsgo` + `vitest run`.
