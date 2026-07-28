---
name: Custo só vale de fornecedor que entrega a quantidade
description: Proibido precificar com o custo de um fornecedor cujo serviço não aceita a quantidade do pacote (min/max). Custo e despacho olham a mesma faixa.
type: constraint
---
Regra v351, nascida dos 9 pacotes eternamente pausados por "venderia no
prejuízo".

## O que acontecia
O motor de custo (`pricing-cache.server.ts`) pegava o MENOR custo entre os
fornecedores vinculados sem olhar a faixa (`min`/`max`) do serviço. O
roteamento de despacho (v286) descarta quem não aceita a quantidade. Duas
verdades diferentes:
- `yv10m` (10 milhões de views) precificado com o fornecedor cujo serviço
  aceita no máximo 1 milhão → preço R$ 78 mil contra custo real R$ 92 mil.
- `tl50k..tl500k` precificados com serviço de teto 20.000.

Resultado: preço abaixo do custo de quem realmente entrega, pausa por margem
todo ciclo, e o motivo do alerta apontando para o lugar errado.

## Regra
1. Fornecedor fora da faixa NÃO entra na conta do custo — mesma trava do
   despacho (`serviceAcceptsQty` em `src/lib/critical-guards.ts`).
2. Faixa desconhecida (0/ausente) nunca bloqueia: falta de dado não para venda.
3. Se sobrar só fornecedor caro e o preço justo virar fora de mercado, o pacote
   sai do catálogo (prateleira honesta) — não fica pausado eternamente.
4. Coberto por `src/__tests__/cost-qty-range.test.ts`.

**Como aplicar:** qualquer caminho novo que escolha custo de fornecedor passa
por `serviceAcceptsQty` antes de comparar preço.
