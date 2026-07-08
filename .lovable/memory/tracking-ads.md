---
name: Tracking Google Ads + GA4
description: IDs oficiais de conversão Google Ads/GA4 e local onde disparam. Não trocar sem alinhar.
type: feature
---
GA4: `G-TKGLV8VB6W` (carregado em `src/routes/__root.tsx` via gtag.js).
Google Ads: `AW-16655771808` (config no mesmo bloco gtag do root).
Conversão Compra: `send_to: AW-16655771808/jbsRCMOT8cwcEKDRi4Y-` — disparada em `src/routes/obrigado.tsx` via `useEffect` com dedup (`useRef`), lendo `value` e `orderId` (transaction_id) da URL.
Contagem = "Uma" (não conta upsell/refresh como venda dupla). Moeda BRL.
Nunca duplicar o evento em outra rota. Nunca trocar o ID sem trocar aqui + no Google Ads.
