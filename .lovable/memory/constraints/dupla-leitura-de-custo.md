---
name: Dupla leitura de custo antes de pausar por margem
description: Pausa por margem exige custo vivo E custo gravado reprovando; diferença ≤5% é ruído de tarifa, >5% é prejuízo real.
type: constraint
---
v361. Divergência entre o custo gravado no banco e o custo vivo do fornecedor não
pode, sozinha, tirar pacote da vitrine.

**Regra (`margemReprovaNasDuasLeituras` em `src/lib/bench-sweep.ts`,
limiar em `src/lib/margin-guardian.ts`):**
- Só pausa quando as DUAS leituras (viva e gravada) reprovam a margem mínima.
- Diferença ≤5% entre as leituras = ruído de tarifa/câmbio → NÃO pausa.
- Diferença >5% com reprovação = prejuízo estrutural → pode pausar.
- Sem custo gravado confiável (0/null), vale o veredito da leitura viva.

**Trava:** `src/__tests__/margem-dupla-leitura.test.ts` e
`src/__tests__/margin-epsilon.test.ts`. Limiar de margem só existe no módulo dono.
