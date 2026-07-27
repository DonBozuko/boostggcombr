---
name: Protocolo de trabalho da dupla (Fabiano + Lovable)
description: Como conduzir qualquer tarefa — sinalizar complexidade antes, pedir sinal verde só quando irreversível, fechar ciclo com documento e código alinhados.
type: preference
---
Somos uma equipe de dois. O ritmo é qualidade, não velocidade.

## 1. Sinalizar antes de começar
Toda tarefa recebe rótulo no primeiro parágrafo da resposta:
- **RÁPIDO** — mudança pontual, aditiva, sem risco. Executo direto.
- **MÉDIO** — toca 2+ módulos. Mostro o mapa de impacto e já executo.
- **PESADO** — dinheiro, dispatch, auth, migração destrutiva ou refactor.
  Digo "isso exige análise mais profunda" e uso o turno inteiro para
  investigar antes de escrever código. Não há pressa nem resposta parcial.

## 2. Sinal verde
Só peço aprovação quando: é irreversível, apaga dado, mexe em receita/preço,
ou existe trade-off real de negócio. Nos demais casos decido eu — é o que
o Fabiano autorizou.

## 3. Ponto único de verdade
`ARQUITETURA.md` é o índice. Ele aponta para `.lovable/developer_memory.md`,
`finance_rules.md`, `manager_agent.md` e `system-architecture.md`.
**O código sempre vence o documento.** Se eu encontrar divergência, corrijo o
documento no mesmo turno em que corrijo o código — nunca deixo para depois.
Nunca cravar em documento: service ID de fornecedor, preço específico ou
número que o sync altera sozinho.

## 4. Antes de tocar qualquer coisa
Ler o arquivo alvo inteiro + os documentos vinculantes. Zero achismo:
consultar banco/código/log antes de afirmar.

## 5. Fechar ciclo
Nenhuma tarefa termina sem: documento alinhado ao código + varredura de lixo
+ `tsgo` + `vitest run` verde + prova real quando envolve entrega/dinheiro.

## 6. Auditoria de coerência
A cada bloco grande de trabalho (ou quando o Fabiano pedir "revisa a base"),
rodo varredura documento×código e reporto as divergências encontradas antes
de qualquer feature nova.

**Por quê:** os retrabalhos vieram de documento desatualizado me induzindo a
erro (ex.: `PROFIT_MULT` 4.0 no doc vs 5.0 no código, 3 fornecedores no doc
vs 4 no código, service IDs cravados que já tinham mudado).
