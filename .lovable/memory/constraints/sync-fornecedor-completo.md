---
name: Sincronização de fornecedor tem que ser completa
description: Catálogo inteiro vindo do provedor, em tabela do banco, com job automático e detector de variantes — nunca amostra hardcoded nem ID preenchido à mão.
type: constraint
---
Toda integração de fornecedor (SMMhype, SMMPainel, Verified, provider4, Mercado Pago,
TikTok, etc) obedece aos quatro pontos:

1. **Catálogo completo** sincronizado do provedor — nunca amostra hardcoded.
2. **Tabela atualizável no banco**, nunca constante em código.
3. **Job automático** (pg_cron diário no mínimo) que mantém tudo fresco.
4. **Detector automático de variantes** (BR/mundial, com/sem refill, faixas de
   quantidade) que popula `service_id_matrix` sem intervenção manual.

**Teste de sanidade:** se em algum momento for preciso digitar um service ID à mão,
o sync está incompleto. Arruma o sync, não o valor.
