---
name: Operational Freeze v655
description: Bloqueio de alterações em áreas críticas após auditoria v654.
type: constraint
---
# Operational Freeze v655

## Regras de Congelamento
- **Áreas Bloqueadas:** Pagamentos, Webhook, Dispatch, Ledger, Jarvis Truth Protocol, SEO/SSR.
- **Protocolo de Mudança:** Exige auditoria de impacto, testes de regressão e validação forense.
- **Invariantes:** Nunca transformar UNKNOWN em GREEN; Nunca remover testes; Nunca alterar regras financeiras sem validação.

Referência: `.lovable/auditoria-v654/BASELINE.md`
