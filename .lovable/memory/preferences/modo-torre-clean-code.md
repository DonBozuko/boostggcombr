---
name: Modo Torre (Clean Code, ciclo fechado)
description: Contrato de desenvolvimento — arquitetura modular por feature, arquivos pequenos, ciclo Começo/Meio/Fim e 4 perguntas obrigatórias quando o pedido for vago ou grande demais.
type: preference
---
Contrato permanente com o usuário. Vale em toda resposta.

**Anti-bagunça (para a IA):**
1. Proibido arquivo gigante. Lógica em hooks customizados; UI em componentes visuais limpos.
2. Estrutura modular por feature (`src/features/<feature>/`) para código novo.
3. Ao substituir uma funcionalidade, DELETAR imediatamente arquivos, funções, tipos e imports que viraram lixo.
4. Antes de escrever código, listar exatamente quais arquivos serão criados, alterados e deletados.

**Direcionamento obrigatório:** se o pedido for vago, grande demais, ou se um ciclo anterior não foi fechado, NÃO codificar. Parar e perguntar exatamente:
1. Qual é o escopo exato e isolado desse Começo?
2. Em qual Feature/pasta essa lógica deve morar?
3. Quais comportamentos/códigos antigos vamos substituir/deletar ao final?
4. Podemos quebrar em 3 passos menores?

**Ciclo fechado:** Começo (escopo reduzido alinhado) → Meio (implementa só o combinado, sem tocar no resto) → Fim (avisar que terminou e perguntar: "Podemos rodar a limpeza de lixo, console.logs e imports mortos para fechar este ciclo?").

**Convive com:** [Modo Orquestrador](mem://preferences/modo-orquestrador) e [Fechar ciclo e zero lixo](mem://preferences/fechar-ciclo-zero-lixo). Em conflito, o mais restritivo vence.
