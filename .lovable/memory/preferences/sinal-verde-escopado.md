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
Fonte da verdade: `src/lib/coverage-map.ts` (inventário de famílias × detector)
+ `src/lib/surface-text.ts` / `src/services/surface-scan.server.ts` (v332:
varredura do texto visível de TODAS as rotas públicas e do blog, e denúncia de
rota nova sem detector declarado). Antes de dar verde, ler esse mapa e listar
o que está com `detector: null` como NÃO COBERTO.


## v333 — mapa fechado (nenhuma família com `detector: null`)
- Imagens/provas visuais: `src/lib/asset-coherence.ts` (arquivo ausente, imagem
  sem descrição, descrição prometendo BR/reposição inexistente). Varre rotas
  públicas + componentes de venda.
- E-mails transacionais: `src/lib/email-coherence.ts` (promessa acima do
  catálogo e lacuna `{{campo}}` / `undefined` vazando para o cliente).
Regra: se alguém adicionar família nova em `coverage-map.ts` com `detector:
null`, a auditoria volta a gritar PONTO CEGO — é assim que deve ser.
