---
name: Vínculo do banco vence a semente do código (v359)
description: O motor de preço não pode regravar smmhype_service_id com o ID chumbado no código. O vínculo gravado só perde a vez se ele mesmo não entregar a quantidade.
type: constraint
---
## O que acontecia
A cada `syncPricingCacheAll`, o motor regravava `smmhype_service_id` com o ID
vindo de `resolveServiceIdAsync` (matriz do CÓDIGO). Qualquer vínculo escolhido
no admin — ou corrigido à mão para um serviço que entrega a quantidade — era
apagado no ciclo seguinte. p350k/p500k voltavam a nulo e os yv1.5m..yv10m
voltavam ao serviço 14321 (teto 1M). Custo saltava, "PACOTE APOSENTADO"
disparava, o dono corrigia, e o ciclo repetia. Loop eterno, culpa nossa.

## Regra
1. ID no código é SEMENTE, nunca verdade (ver fonte-unica-id-fornecedor).
2. `chooseBoundServiceId` (`src/lib/bind-authority.ts`) decide:
   sem vínculo → semente; faixa desconhecida → mantém o vínculo; vínculo que
   aceita a quantidade → mantém; vínculo que não aceita → cai para a semente.
3. Trocou o ID, o custo é recalculado pela tarifa de quem entrega — nunca
   herdar custo do serviço antigo.
4. `guardBindings` (v320) continua sendo a última porta antes de gravar.
5. Trava: `src/__tests__/bind-authority.test.ts`.
