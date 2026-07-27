---
name: Preço tem dono único (v305)
description: Só src/lib/price-authority.server.ts pode gravar price_brl. Qualquer outro motor que escrever preço é bug — existe teste que barra o deploy.
type: constraint
---
1. **Único escritor**: `src/lib/price-authority.server.ts`. Motores de sync
   (`pricing-engine`, `pricing-cache`, `recostFromReserves`, `auto-healer`)
   gravam **custo e IDs**, nunca preço.
2. O teste `src/__tests__/price-single-writer.test.ts` varre o `src/` e
   quebra o build se aparecer um segundo escritor. Nunca remover.
3. A autoridade roda **por último** no ciclo e aplica de uma vez: margem
   mínima (4x líquido), anti-oscilação (preço saudável não desce sozinho),
   teto de +40% por reajuste e escada monotônica.
4. Reajuste acima de +40% não entra às cegas: o pacote **sai da vitrine**
   com motivo em português e volta sozinho quando o preço é corrigido.
   Pausa sem contrapartida de retorno é bug.

**Por quê:** o "conserta e volta" tinha causa única — cinco motores gravando
`price_brl` com regras diferentes. O quinto (auto-healer) só apareceu quando
escrevi o detector; corrigir caso a caso nunca ia terminar.
