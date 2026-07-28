---
name: Saldo nunca bloqueia a venda (v352)
description: v352 — falta de saldo no fornecedor não pausa pacote (v350) E não recusa cobrança. Vende, avisa o dono na hora e o pedido sai sozinho na recarga.
type: constraint
---
Regra permanente (v352), estende a v350 e substitui a trava de saldo da v322
dentro do preflight de rota.

1. **Saldo não recusa cobrança.** `evaluateRoute` (`src/lib/route-preflight.ts`)
   não elimina mais fornecedor sem saldo: ele vira última opção (degradado) e
   `needsTopup = true`. Bloqueio continua valendo para: sem ID de serviço
   (estrutural) e margem negativa.
2. **Aviso na hora.** Venda com `needsTopup` dispara alerta com `force: true`
   ("💳 RECARREGUE O FORNECEDOR AGORA"), cooldown de 30min por pacote.
   O dono repõe na hora — é o modelo de operação declarado.
3. **Pedido espera, não estorna.** Sem saldo no despacho, o pedido parqueia em
   `waiting_provision` e sai sozinho quando a recarga entra. Estorno automático
   continua reservado a falha `permanent` (v296).
4. **Bancada continua diagnosticando saldo.** `classifyBench` devolve veredito
   `saldo` mesmo com `res.ok = true`, para o painel/celular mostrarem quanto
   falta recarregar e onde.

**Por quê:** recusar a venda por saldo perde dinheiro por um problema que se
resolve com um Pix em segundos. O cliente tem prazo de entrega; o dono tem
dinheiro no banco e recarrega ao receber o aviso.

Invariantes: `src/__tests__/route-preflight.test.ts` (v352) e
`src/__tests__/bench-sweep.test.ts`.
