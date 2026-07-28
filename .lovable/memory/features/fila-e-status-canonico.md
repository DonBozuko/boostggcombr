---
name: Fila autônoma e status canônico (v324/v325)
description: Pedido pago nunca depende de clique humano para andar; cliente só vê 8 status públicos, traduzidos por um módulo único.
type: feature
---
## v324 — Fila que anda sozinha
- Estados de fila: `waiting_provision`, `MARGIN_HOLD`, `SMM_FAILED`.
- `src/lib/queue-policy.ts` (puro) decide: esperar / retentar / escalar.
  Idade mínima 15min, backoff 15→30→60→120→240min, teto de 5 tentativas.
- O sweep roda dentro de `src/services/pedido-reconciler.server.ts` (cron 5min),
  chamando `reprocessWaitingProvision`. O botão do Telegram continua existindo,
  mas virou atalho, não a única saída.
- No teto, alerta em português com cooldown de 12h e duas opções claras:
  recarregar/reprocessar ou devolver o dinheiro.

## v325 — Status canônico
- `src/lib/order-status.ts` é o ÚNICO tradutor de status para o cliente.
  Os ~25 estados internos continuam no banco (diagnóstico); o cliente vê 8:
  PENDENTE, PAGO, EM_PROCESSAMENTO, ENVIADO_AO_FORNECEDOR, EM_ENTREGA,
  CONCLUIDO, CANCELADO, ERRO.
- Proibido criar tabela de tradução local em componente ou server fn.
- Trava: `src/__tests__/order-status.test.ts` quebra o build se alguém gravar
  em `pedidos.status` um valor fora do mapa. Status novo = mapear primeiro.
- Status desconhecido nunca desaparece: cai em ERRO (falha visível, não silenciosa).

**Por quê:** o modelo "produto + fornecedores + fila + orquestrador + 8 status"
já existia aqui em 6 dos 7 pontos, menos estes dois: a fila só andava com
clique humano e cada tela inventava sua própria tradução de status.
