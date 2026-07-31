---
name: Portão de Risco (v393)
description: Antes de executar qualquer pedido do dono, classificar zona vermelha/amarela/verde, listar travas atravessadas e reescrever o pedido em versão segura.
type: preference
---
Protocolo completo em `.lovable/risk-gate.md`.

Resumo: o dono não precisa saber o que quebra — eu barro antes.
1. Classifico a zona (vermelha = preço/despacho/pagamento/vitrine/autonomia;
   amarela = promessa e landing; verde = só aparência).
2. Em vermelha/amarela: leio a autoridade da área e listo as travas de teste
   que o pedido atravessa. Contornar teste é proibido.
3. Respondo no formato: O QUE VOCÊ PEDIU / O QUE ISSO QUEBRARIA / VERSÃO SEGURA.
   Mesmo resultado de negócio → executo a versão segura e explico depois.
   Resultado diferente → uma pergunta objetiva antes.
4. Zona vermelha sobe APP_VERSION e a resposta diz "precisa publicar".
