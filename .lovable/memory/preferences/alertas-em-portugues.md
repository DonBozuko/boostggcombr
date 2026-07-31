---
name: Alertas em português direto
description: Formato obrigatório de todo alerta Telegram/WhatsApp — título claro, PROBLEMA, O QUE FAZER, sem jargão técnico.
type: preference
---
Todo alerta que chega no celular do dono é escrito para ser entendido em 3 segundos,
sem abrir o painel e sem saber programação.

**Formato obrigatório:**
```
<título claro do que aconteceu>
PROBLEMA: ...
O QUE FAZER: ...
```

**Proibido no texto:** SLA, ledger, smoke test, parqueado, reconciliação, payload,
retry, idempotência, cron, endpoint, deploy. Se a palavra só existe no código, ela
não vai para o alerta.

**Regra extra:** alerta de dinheiro/entrega carrega a versão que rodou a varredura
(`carimboVersao()` em `src/lib/build-stamp.ts`), porque alerta repetido quase sempre
é versão publicada velha, não bug novo.
