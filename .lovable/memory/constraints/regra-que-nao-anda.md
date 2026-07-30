---
name: Regra que pausa tem de andar sozinha (v371)
description: Proibido estado que pausa e congela sem caminho de saída automático. Foi a causa do "alarme que não anda" em br-tf100/br-tf500.
type: constraint
---
## O que acontecia
Em `planAuthorityPrices` (`src/lib/price-authority.ts`), quando nem o teto de
+40% por ciclo cobria o custo, o preço ficava CONGELADO e o pacote pausado.
Como nada mudava de um ciclo para o outro, a varredura repetia exatamente o
mesmo alerta para sempre (br-tf100|margem, br-tf500|margem, 6 varreduras
iguais). Não era o fornecedor: era regra nossa sem saída.
Pior: `price-authority.server.ts` tinha `.neq("is_sellable", false)` ao gravar
o motivo, então pacote já pausado nunca tinha o texto atualizado — o dono
continuava lendo "custo disparou 90%: aposentado", motivo que já não existia.

## Regra
1. Teto por ciclo é LIMITE DE VELOCIDADE, nunca sentença. O valor anda o que
   pode agora e converge em 1-2 ciclos.
2. Todo estado de pausa precisa de caminho de saída automático + motivo
   reescrito a cada ciclo. Pausa sem rampa = alarme eterno.
3. Sobrescrever motivo de pausa só quando o motivo é do MESMO motor (margem)
   ou o pacote está ativo — nunca apagar pausa de outro motor.
4. Alerta idêntico repetido N ciclos = defeito nosso de convergência, não do
   fornecedor. Procurar a variável que não muda.
5. Trava: `src/__tests__/price-authority.test.ts` (v371).
