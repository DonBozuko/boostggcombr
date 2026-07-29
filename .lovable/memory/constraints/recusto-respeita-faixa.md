---
name: Recusto de reserva também respeita a faixa (v358)
description: recostFromReserves só pode usar tarifa de serviço que aceita a quantidade do pacote. Foi a causa do loop "PACOTE APOSENTADO" em p350k/p500k.
type: constraint
---
## O que acontecia
`recostFromReserves` (`src/lib/pricing-engine.server.ts`) pegava a tarifa do
serviço de reserva sem olhar `min`/`max`. p350k (350.000) e p500k (500.000)
apontavam para smmpanel #52, que entrega no máximo 200.000. O recusto gravava
um custo barato e fantasma; o ciclo seguinte lia o custo de quem realmente
entrega, via salto de ~4x e disparava "PACOTE APOSENTADO". No ciclo seguinte
tudo se repetia — o dono recebeu o MESMO alerta 5x idêntico.

## Regra
1. Todo caminho que escolhe custo passa por `serviceAcceptsQty` (v351) — o
   recusto inclusive. Entre os viáveis, vence o mais barato.
2. Pacote sem NENHUM fornecedor na faixa não fica vendável com custo mentiroso:
   sai da vitrine com motivo em português até vincular fornecedor que entregue.
3. Alerta repetido idêntico é sintoma de ping-pong entre motores de custo —
   procurar quem grava custo diferente no mesmo pacote, não silenciar o alerta.
4. Trava: `src/__tests__/recost-qty-range.test.ts`.
