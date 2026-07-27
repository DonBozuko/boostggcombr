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

## v307 — Faxina: também tem dono único a FÓRMULA (não só a gravação)
5. **Nenhuma rota de venda conhece custo.** As landing pages não calculam
   preço: mostram esqueleto até o banco responder e exibem só o que a
   Autoridade gravou. Pacote sem preço no banco NÃO aparece na vitrine.
6. `src/lib/profit-markup.ts` é só `formatBRL`. A fórmula antiga (multiplicador
   por faixa 5x/8x/12x + piso escalonado + buffer de cupom) está morta.
7. `pricing-engine.server.ts` é ESPELHO do banco ao servir: não aplica piso,
   escada nem markup. Só calcula preço-semente de pacote que ainda não existe.
8. Alerta de Telegram não estima custo por fórmula inversa: lê `cost_brl` real.
   Sem custo registrado, o alerta diz que não sabe — nunca inventa número.
9. Trava: `src/__tests__/price-single-math.test.ts` quebra o build se a fórmula
   ressuscitar fora da Autoridade ou se rota de venda voltar a ver custo.
