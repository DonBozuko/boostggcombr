# Correção: webhook do Mercado Pago está morto há 28 dias

## O que o alerta vermelho realmente significa

O J.A.R.V.I.S. está certo, mas o texto do alerta subestima o problema. Ele diz "webhook falhou/atrasou". A verdade medida agora é pior: **o webhook do Mercado Pago não chega ao BoostGG desde 09/07/2026**. Todas as vendas desde então foram salvas pela rede de contingência (polling), não pelo caminho principal.

Evidências coletadas (não é hipótese):

- Tabela `webhook_events`: 24 eventos no total, o último em `2026-07-09 19:54`. Zero eventos nos últimos 14 dias, apesar de vendas aprovadas em 30/07, 04/08 e 06/08.
- O pedido `0bf8b0d5` (06/08, R$ 6,40) foi confirmado às 15:15 por `contingency-pooling`, não pelo webhook.
- Teste HTTP real na URL cadastrada no Mercado Pago:

```text
POST https://boostgg.com.br/api/public/mp-webhook   -> 307 redirect para www
GET  https://boostgg.com.br/api/public/mp-webhook   -> 302 redirect para www
POST https://www.boostgg.com.br/api/public/mp-webhook -> 401 "Invalid signature" (rota viva e validando)
```

## Causa raiz

O código manda para o Mercado Pago a `notification_url` no domínio **sem www** (`https://boostgg.com.br/api/public/mp-webhook`). O domínio apex hoje responde **redirect 301/307 para o www**. O Mercado Pago **não segue redirects** em notificação: ele vê uma resposta não-2xx, marca a entrega como falha, retenta e depois desiste. Por isso o webhook nunca executa e a contingência precisa salvar toda venda.

Isso explica, de uma vez só:
- o alerta vermelho de contingência a cada venda;
- a demora entre o Pix cair e a notificação chegar no Telegram (a contingência só roda no polling/cron, não no instante do pagamento);
- o item "Webhook MP — pooling salvou 1x em 24h" no console de integridade.

Não é problema de Webhook Secret. A assinatura está funcionando (a rota respondeu 401 corretamente para uma requisição sem assinatura).

## O que será feito

1. **Apontar a notificação para o domínio canônico (www)**
   Trocar `https://boostgg.com.br/api/public/mp-webhook` por `https://www.boostgg.com.br/api/public/mp-webhook` nos três pontos que criam cobrança:
   - `src/lib/pedidos.functions.ts` (Pix e cartão)
   - `src/lib/reseller-portal.functions.ts` (recarga de revendedor)
   Em vez de repetir a string, criar uma constante única `MP_NOTIFICATION_URL` em um módulo compartilhado, para que nunca mais existam três verdades diferentes sobre a URL do webhook.

2. **Sentinela de webhook morto (nova, e é o que faltava)**
   Hoje o sistema só percebe o problema indiretamente, uma venda por vez. Adicionar uma verificação no J.A.R.V.I.S. (mesmo motor que já lista os 9 checks) que compara: houve pagamento aprovado nas últimas 24h **e** nenhum registro em `webhook_events` no mesmo período? Se sim, alerta crítico único no Telegram dizendo que o canal principal está morto — não um alerta por venda.

3. **Corrigir o texto do alerta de contingência**
   O alerta atual manda "verifique o Webhook Secret", conselho errado que custou tempo. Passa a orientar a checar a URL de notificação e o status do canal.

4. **Validação pós-correção**
   - Criar um pedido de teste real de valor mínimo, pagar, e confirmar que aparece linha nova em `webhook_events` com `processed_ok = true` e que a notificação do Telegram chega em segundos, sem o alerta de contingência.
   - Reexecutar o Detector de Mentiras e confirmar que o alerta vermelho (8/9) apaga.

## Garantias de não-regressão

- A contingência **não será desligada**. Ela continua como rede de segurança; a diferença é que voltará a ser exceção em vez de regra.
- A idempotência permanece intacta: com o webhook voltando a funcionar, o guard `webhook_events` + a trava de ledger + o `claimDispatch` continuam impedindo cobrança dupla e entrega dupla. O caminho webhook e o caminho contingência já convergem para o mesmo commit atômico.
- Nenhuma mudança em preço, roteamento de fornecedor, RLS ou SEO.
- O apex continua redirecionando para www normalmente para visitantes — só a chamada máquina-a-máquina deixa de depender do redirect.

## Detalhe técnico

- Arquivos alterados: `src/lib/pedidos.functions.ts` (2 ocorrências), `src/lib/reseller-portal.functions.ts` (1), novo módulo de constante, `src/lib/payment-contingency.server.ts` (texto do alerta), e o módulo do detector J.A.R.V.I.S. para o novo check.
- Após o deploy, pagamentos novos passam a chegar por webhook. Pagamentos antigos já processados não são afetados (idempotência por `pedido_id` no ledger).
- Se o Mercado Pago também tiver a URL antiga cadastrada manualmente no painel dele, a `notification_url` enviada por pedido tem prioridade — mas vale conferir depois para deixar os dois iguais.
