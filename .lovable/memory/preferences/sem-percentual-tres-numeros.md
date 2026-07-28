---
name: Sem percentual chutado — três números medidos
description: v354 — proibido dizer "sistema está X%". O que vale é o Termômetro Real no painel: entrega sem toque humano, tempo pago→entregue e estornos no mês.
type: preference
---
Proibido declarar maturidade do sistema em percentual ("estamos em 80%").
Não é medido, é chute, e chute esconde regressão.

O que vale (painel SLO → card "Termômetro real", janela de 30 dias,
`src/lib/maturity-metrics.ts`):

1. **Entrega sem toque humano (%)** — pedidos entregues sozinhos ÷ total
   entregue. Toque humano = `error_detail` com "recarga manual",
   "robô externo confirmou", "refund manual" ou "aprovação humana".
   A fila automática (cron) grava a tag `v354 fila automática` e NÃO conta
   como toque.
2. **Tempo pago → entregue** — mediana e média, com tamanho da amostra visível.
3. **Estornos no mês** — dinheiro devolvido ao cliente.

Regra: sem amostra, mostrar "—". Nunca preencher com estimativa.

**Why:** o "%" ficou parado em 80% por meses sem nada medindo. Agora a evolução
é observável: se a autonomia cair ou o tempo subir, aparece no painel antes do
cliente reclamar.
