---
name: Custo de decisão vem do serviço que será despachado (v360)
description: O custo usado para julgar margem tem de sair do MESMO ID de fornecedor que o dispatch vai usar. Foi a causa do loop "PACOTE APOSENTADO" nos pacotes de YouTube Views.
type: constraint
---
## O que acontecia
Em `rankProvidersByCost` (`src/lib/smart-routing.server.ts`) a tarifa da
smmhype era lida de `services_cache` pelo ID SEMENTE do código
(`resolveServiceIdAsync`) — 14321, YouTube Views com teto de 1 milhão e
US$ 0,63/mil — enquanto o vínculo do banco era 18785 (teto 10 milhões,
US$ 0,44/mil).

Dois custos para o mesmo pacote: o motor de preço formava o preço com 0,44 e a
Bancada julgava a margem com 0,63 → "venderia no prejuízo" → pausa → o motor
religava → alerta idêntico para sempre (yv1.5m, yv2m, yv3m, yv5m, yv10m).

## Regra
1. Toda leitura de tarifa usa o ID VINCULADO (`providerIdMap`), nunca a semente
   do código. A semente só vale quando não existe vínculo nenhum.
2. Isso vale para os quatro fornecedores — smmhype não é exceção.
3. Drift pequeno de tarifa (até 1,5%, `MARGIN_EPSILON` em
   `src/lib/margin-guardian.ts`) não aposenta pacote: o ciclo de preço reajusta.
4. Trava: `src/__tests__/cost-bound-service.test.ts`.

**Como aplicar:** se um alerta de margem se repetir idêntico, o suspeito nº 1 é
custo lido de um serviço diferente do que vai ser despachado — nunca silenciar
o alerta.
