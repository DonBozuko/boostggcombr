# Estabilização BOOSTGG — Causa Raiz, não sintoma

Auditoria executada agora contra o banco de produção e o código. Abaixo apenas o que foi **verificado com leitura real** (query ou arquivo), separando causa de sintoma. Onde não tenho prova, digo que é hipótese a confirmar.

## Estado real medido (para calibrar o diagnóstico)

- Pedidos 30 dias: 9 concluídos, 3 pendentes (testes de 08/08), 4 reembolsados, 2 expirados, 1 cancelado.
- `financial_ledger`: **0 pedidos concluídos sem lançamento**. Integridade financeira contábil está OK.
- Catálogo: 271 pacotes, **0 sem preço, 0 sem custo, 0 bloqueados**.
- Nenhum pedido travado em `processing`. Nenhuma falha de cron nas últimas 24h.
- Único alerta dos últimos 7 dias: `robos_sem_resposta` (8x, já resolvido).

Ou seja: o sistema **não está quebrado de forma contínua hoje**. O que existe são falhas de baixa frequência e alto custo (reembolso, venda perdida, checkout lento). É nisso que o plano ataca.

## Causa raiz 1 — Duas autoridades de preço (perda de margem real)

`src/lib/pedidos.functions.ts` tem uma tabela de preços fixa no código (`PRICE_TABLE`, ~100 linhas) usada como fallback quando o motor de preço falha. Comparando com o banco agora:

```text
pacote   PRICE_TABLE   pricing_items   diferença
p500        12,00         19,00         -37%
p1k         18,00         23,47         -23%
ys100       29,00         39,81         -27%
yv1k        19,00         30,58         -38%
kf2k        49,00         63,41         -23%
```

Pior: `p50`, `p150` e `p200` — pacotes que **já foram vendidos de verdade** — não existem nessa tabela. Se o motor de preço falhar, o cliente recebe `INVALID_PACKAGE` (venda perdida) ou paga até 38% abaixo do preço com margem aprovada.

Correção: remover a tabela fixa. O preço passa a vir de uma única leitura de `pricing_items`; se essa leitura falhar, o checkout falha de forma honesta com mensagem clara em vez de vender barato. Um teste trava a regra ("nenhum preço nasce fora de pricing_items").

## Causa raiz 2 — Checkout serial (Pix lento e "travando")

O caminho até o QR Code hoje é uma fila de chamadas em sequência: limite de requisições → chave de emergência → busca de preço BR → motor de preço → checagem de disponibilidade → pré-checagens de rota e de perfil (orçamento de 5s) → chamada ao Mercado Pago com retentativas. São **24 carregamentos dinâmicos de módulo e 4 idas ao banco** antes de qualquer resposta, e três dessas idas leem **a mesma linha** de `pricing_items`.

Correção: uma única leitura da linha do pacote (preço, quantidade, disponibilidade e vínculos de fornecedor juntos) e execução em paralelo das checagens independentes. Nada de regra removida — mesmas travas, mesma ordem lógica, menos espera.

## Causa raiz 3 — Entrega despachada em segundo plano depois do "200"

`src/routes/api/public/mp-webhook.ts` (870 linhas) responde 200 ao Mercado Pago e continua o despacho num trabalho de fundo. Na infraestrutura serverless, esse trabalho pode ser interrompido: pagamento confirmado, entrega não iniciada. Hoje isso é coberto pelo reconciliador de 5 em 5 minutos — mas por **cura**, não por **desenho**.

Correção: o webhook grava a intenção de despacho de forma durável (fila no banco) antes de responder, e o processamento consome essa fila. Assim, mesmo que o worker morra, o pedido não fica órfão — e não depende de o reconciliador "adivinhar".

## Causa raiz 4 — Reembolsos por vínculo de fornecedor

Os dois reembolsos reais (`p15k` R$ 283,44 — "Incorrect service ID"; `kf2k` R$ 18,00 — "ID reserva ausente") têm a mesma família: o vínculo com o fornecedor estava aceito na pré-checagem, mas o serviço não entregou. As travas v297/v320/v359 já existem. O que falta é **prova por fornecedor no momento da cobrança para pacotes de valor alto**, onde o prejuízo de um erro é grande.

Correção: acima de um valor configurável, a pré-checagem deixa de aceitar "fail-open" silencioso e exige rota comprovada; abaixo dele, continua liberando a venda como hoje (não perder venda pequena por instabilidade).

## Causa raiz 5 — Gatilho duplicado no banco

`pricing_items` tem o **mesmo** gatilho de margem registrado duas vezes (`pricing_items_enforce_markup` e `trg_enforce_pricing_markup`), executando a mesma função em cada gravação. Custo dobrado em toda atualização de catálogo e risco de comportamento confuso em auditoria de preço.

Correção: migração removendo o gatilho duplicado, mantendo um só.

## Causa raiz 6 — 28 robôs, 12 deles a cada 5 minutos

É a origem provável dos alertas `robos_sem_resposta`: rajadas de chamadas HTTP concorrentes contra o próprio site. Hipótese a confirmar com leitura das respostas HTTP antes de mexer — não vou desligar robô sem prova.

## Ordem de execução

1. Preço com autoridade única (causa 1) + teste de trava.
2. Gatilho duplicado (causa 5) — migração isolada, risco zero.
3. Checkout de leitura única e paralela (causa 2).
4. Fila durável de despacho no webhook (causa 3).
5. Pré-checagem estrita por valor (causa 4).
6. Consolidação dos robôs (causa 6), só após medir.

Cada passo termina com: suíte de testes verde, `bun run build:dev` verde e verificação do fluxo de compra real no preview.

## O que pode quebrar e como protejo

- Remover a tabela fixa de preço muda o comportamento quando o banco está fora: hoje vende barato, passará a recusar. É uma troca deliberada de "perder margem" por "perder uma venda rara". Se você preferir o contrário, digo agora e mantenho o fallback com trava de margem mínima.
- Fila durável no webhook exige nova tabela; o caminho antigo fica ativo em paralelo por um ciclo para não perder pedido durante a transição.
- Pré-checagem estrita pode recusar pedido grande em instabilidade de fornecedor. É intencional: um reembolso de R$ 283 custa mais que uma venda adiada.

## Detalhes técnicos

- Arquivos: `src/lib/pedidos.functions.ts`, `src/lib/pricing-engine.server.ts`, `src/routes/api/public/mp-webhook.ts`, `src/lib/route-preflight.server.ts`, novos testes em `src/__tests__/`.
- Migrações: remoção de gatilho duplicado; tabela `dispatch_queue` com GRANTs e RLS restrita a `service_role`.
- Nenhuma alteração em `financial_ledger`, `dispatch-claim`/`dispatch-commit` ou no mapa canônico de status.
