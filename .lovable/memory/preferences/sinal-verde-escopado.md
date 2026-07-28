---
name: Sinal verde só vale onde existe detector
description: Proibido declarar "tudo certo" de forma ampla. Verde só pode ser dado sobre a lista de invariantes automatizadas; o resto é declarado como NÃO COBERTO.
type: preference
---
Regra nascida da v331, depois de auditorias manuais de layout acharem erros
graves em rotas que eu já tinha dado sinal verde.

## Causa do falso verde
Meus "verdes" mediam só o que tinha detector (preço, margem, rota, saldo,
entrega, RLS). Copy, promessa de página, selo e catálogo×texto não tinham
nenhuma invariante — então nunca apareciam como vermelho, e eu confundia
"não medido" com "está certo".

## Regra
1. Verde é sempre ESCOPADO: "verde em X, Y, Z (invariantes N)". Nunca "tudo
   funcionando".
2. Toda área sem invariante entra na resposta como **NÃO COBERTO** — lista
   explícita, não omissão.
3. Achado por auditoria manual = defeito de instrumentação. Vira invariante
   automatizada no mesmo turno (regra "todo bug vira invariante").
4. Antes de dar qualquer verde, conferir a cobertura: quais famílias de falha
   têm detector hoje? O que sobrou fora?

## Famílias com detector (atualizar quando mudar)
preço/margem, escada e curva unitária, vínculo com fornecedor (bind-guard,
fingerprint), saldo vs custo, prateleira honesta/pausa dura, robôs e crons,
pago sem entrega, caixa, e-mail, RLS, e — desde v331 — promessa do site ×
catálogo real (`src/lib/promise-coherence.ts`).
