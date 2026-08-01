---
name: Escopo Fechado (linha de chegada v397+)
description: Escopo oficial validado pelo dono em 01/08/2026. Nada fora desta lista entra sem alerta de fora-de-escopo.
type: feature
---
Escopo fechado e aprovado. Projeto tem desfecho — não é infinito.

## Dentro do escopo (entregue)
1. Vitrine e venda: landings por rede, catálogo com prateleira honesta, checkout Pix (Mercado Pago), cartão (Checkout Pro, teto R$300), cupom, order bump, recuperação de carrinho.
2. Entrega: despacho multi-fornecedor, roteamento inteligente, substituto por impressão digital, reposição (refill), rastreio público.
3. Preço e margem: Autoridade Única de Preço, margin-guardian, markup por faixa de custo, câmbio automático.
4. Robôs: bancada autônoma, smoke test 15min, canário real, auto-healer, reconciliador, escada de autonomia (níveis 1-3).
5. Revenda e afiliados: painel, saldo, comissão, funil, calculadora de lucro.
6. Admin: painel único, auditoria forense, alertas Telegram/WhatsApp em português, portão de risco.
7. SEO/conteúdo: landings, blog, malha de links internos, schema, canônico www.
8. Segurança: auth, RLS, rate limit, assinatura de webhook, gate de testes.

## Fora do escopo (só entra com alerta explícito)
App nativo, marketplace de terceiros, multi-idioma, dashboard de BI próprio,
integração com outros gateways, painel white-label vendido a terceiros.

## Regra de encerramento
Pedido novo fora da lista → responder:
"Atenção: esse pedido está fora do escopo original e pode gerar bagunça no
código atual. Você tem certeza de que isso é vital para o desfecho do app, ou
podemos finalizar o projeto como combinado?"
