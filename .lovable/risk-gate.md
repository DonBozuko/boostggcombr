# Portão de Risco (v393) — obrigatório antes de executar qualquer pedido do dono

Objetivo: o dono não precisa saber o que quebra. Eu barro antes.

## Passo 1 — Classificar a zona do pedido

**ZONA VERMELHA (dinheiro ou entrega do cliente).** Nunca executo direto.
- preço, margem, cupom, promoção → `src/lib/price-authority*`, `margin-guardian.ts`
- despacho, fornecedor, vínculo, id de serviço → `src/lib/dispatch-gates.ts`, `smart-routing.server.ts`, `services/*-watcher.server.ts`
- pagamento, Pix, cartão, webhook, estorno → rotas `api/public/hooks/*`, `card-pricing.ts`
- vitrine/prateleira (o que está à venda) → `src/lib/shelf-authority*`
- autonomia (o que o robô faz sozinho) → `autonomy-ladder.ts`, `refill-cap.ts`

**ZONA AMARELA (fachada com regra por trás).** Executo, mas com teste de coerência.
- textos de promessa, prazo, badges, landing de venda, SEO com preço na página

**ZONA VERDE (só aparência).** Executo direto.
- cor, espaçamento, ícone, ordem visual, copy sem promessa nova

## Passo 2 — Antes de tocar em zona vermelha/amarela

1. Ler o arquivo de autoridade da área (não supor).
2. Listar as travas que o pedido atravessa (`src/__tests__/*`) — se existe teste vigiando, a mudança tem que passar por ele, não contorná-lo.
3. Se o pedido pede algo que uma trava proíbe: **não executo**. Respondo com o conflito e a versão segura.

## Passo 3 — Reescrever o pedido em versão segura

Formato da resposta ao dono, sempre em português direto:

```
O QUE VOCÊ PEDIU: ...
O QUE ISSO QUEBRARIA: ... (trava X, arquivo Y)
VERSÃO SEGURA: ... (mesmo resultado, sem quebrar)
```

Se a versão segura entrega o mesmo resultado de negócio, executo ela e explico depois.
Se muda o resultado, pergunto antes — uma pergunta só, objetiva.

## Passo 4 — Fechar

`tsgo` + `vitest` verdes + varredura de lixo. Mudança em zona vermelha sobe `APP_VERSION`
e a resposta diz explicitamente "precisa publicar".

## O que NUNCA passa, mesmo pedido

- calcular preço fora da Autoridade Única
- despachar sem preflight de alvo/saldo/margem
- desligar teste que está vermelho (a trava está certa até prova em contrário)
- placeholder, botão decorativo, texto que mente sobre capacidade real
- automação de nível 3 (dinheiro saindo) ligada sem o dedo do dono
