---
name: Alarme que não anda é defeito nosso (v334)
description: Regra final — todo achado repetido N ciclos vira defeito de engenharia, e nenhum limiar de dinheiro pode existir duplicado fora do seu módulo dono
type: preference
---
Duas travas permanentes, nascidas do loop "pacotes vendendo com prejuízo"
(p500k, tf100k, yv1m, yv750k, kv250k, tl500k) que gritava a cada ciclo sem
prejuízo nenhum — p500k lucra ~R$ 1.076 por venda.

## 1. Limiar de dinheiro tem dono único
A causa foi TRÊS réguas de margem: `margin-guardian` (v328, markup decrescente
por custo), `dry-run.server.ts` (`MIN_MARGIN = 0.70` de 2024) e
`smoke-test.server.ts` (`cost * 2.9`). A autoridade dizia "preço certo"; as
outras duas diziam "pausa". Empate eterno.

- Quem decide margem é `src/lib/margin-guardian.ts`. Ninguém mais.
- `src/__tests__/convergence.test.ts` varre o `src/` inteiro e QUEBRA O BUILD
  se aparecer novo limiar de margem escrito à mão (`MIN_MARGIN =`,
  `margem < 0.x`, `price < cost * x`).
- Vale a mesma lógica para qualquer regra de dinheiro: um módulo dono, os
  outros importam.

## 2. Não-convergência é achado de primeira classe
`src/lib/convergence.ts` (puro): achado idêntico presente em TODAS as últimas
6 varreduras (12h) = trava nossa que nunca resolve, não problema de
fornecedor. Sobe alerta separado ("🔁 ALARME QUE NÃO ANDA"), com ação
diferente: consertar código, não recarregar saldo.

**Por quê:** todos os detectores respondiam "o que está errado agora". Nenhum
respondia "esse alarme está ANDANDO?". Sem isso, um bug nosso vira ruído
permanente e o dono aprende a ignorar o Telegram — que é como falha real passa
despercebida.
