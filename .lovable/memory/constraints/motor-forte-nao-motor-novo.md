---
name: Motor forte, não motor novo (v366)
description: Proibido criar detector/motor novo quando um existente pode ser fortalecido; todo teste precisa estar reivindicado no mapa de cobertura.
type: constraint
---
1. **Fortalecer > criar.** Antes de escrever um motor/detector novo, provar que
   nenhum existente cobre a família de falha. Sistema que só acumula motor vira
   aterro: ninguém acha a causa depois.
2. **Mapa de cobertura tem dente** (`src/lib/coverage-map.ts`): cada família
   aponta para arquivos de teste REAIS (`provas`).
3. **Trava de build** (`src/__tests__/cobertura-real.test.ts`):
   - prova citada que não existe no disco = detector fantasma → build quebra;
   - teste em `src/__tests__` que nenhuma família reivindica = órfão → build quebra;
   - família sem detector ou sem prova → build quebra.
4. Teste novo NASCE dentro de uma família. Se não couber em nenhuma, a família
   nova precisa de justificativa no mapa — não é arquivo solto.

**Por quê:** o inventário de detectores era texto livre. Citava motor que já
tinha morrido e testes novos ficavam fora do inventário — daí a sensação de
"a cada pergunta aparece erro novo": não aparecia erro novo, aparecia buraco
que ninguém contava.
