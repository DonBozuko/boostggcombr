# BASELINE DE PRODUÇÃO VALIDADA — BOOSTGG v654

## 1. DADOS DA BASELINE
- **Versão Validada:** v654 (Auditoria Forense E2E)
- **Data da Auditoria:** 2026-08-20 (UTC)
- **Estado Oficial:** CONGELADO / GO

## 2. PRINCIPAIS GARANTIAS (Ciclo de Vida v654)
1. **Contrato de Pagamento Estrito:** Ramificação obrigatória `pix` | `cartao` (Zod v649).
2. **Pix Real:** Retorno de BR Code e QR Base64 legítimos (v650).
3. **Cartão Seguro:** Isolamento de meios de pagamento no Checkout Pro (v651).
4. **Exactly-Once Dispatch:** Uso de `external_id` (pedidoId) no envio para fornecedores (v652).
5. **Truth Protocol:** Jarvis NOC opera com evidência ativa; proibido silenciar falhas (v653).
6. **Integridade Financeira:** Financial Ledger com commit atômico e idempotência (v383).
7. **SEO/SSR Estável:** Metadados, sitemap e JSON-LD renderizados no servidor (v647).

## 3. ARQUIVOS CRÍTICOS (NÃO ALTERAR SEM AUDITORIA)
- `src/lib/pedidos.functions.ts` (Contrato de checkout)
- `src/lib/mercadopago.server.ts` (Integração Gateway)
- `src/lib/smmhype.server.ts` (Integração Fornecedor / external_id)
- `src/lib/dispatch-commit.server.ts` (Escrita Ledger/Status)
- `src/lib/jarvis-truth.ts` (Lógica do Truth Protocol)
- `src/lib/jarvis-noc.functions.ts` (Telemetria operacional)
- `src/routes/api/public/mp-webhook.ts` (Porta de entrada financeira)
- `src/routes/__root.tsx` (SEO e estrutura base)

## 4. TESTES DE REGRESSÃO OBRIGATÓRIOS
- `src/lib/fase1-contrato.test.ts`
- `src/lib/fase2-pix.test.ts`
- `src/lib/fase3-card.test.ts`
- `src/lib/fase4-exactly-once.test.ts`
- Todos os testes Vitest devem retornar **PASS** antes de qualquer deploy.

## 5. RISCOS RESIDUAIS
- Dependência de idempotência do lado do fornecedor SMMhype (monitorar `external_id` nos logs).
- Latência de rede em preflights de pacotes de alto valor (timeout configurado em 12s).

## 6. PROCEDIMENTO DE ALTERAÇÃO (GOVERNANÇA)
Qualquer mudança em área crítica exige:
1. Identificação exaustiva de arquivos afetados.
2. Justificativa técnica e impacto nas garantias v654.
3. Execução de testes unitários e E2E no ambiente de preview.
4. Nova Auditoria Forense / Regressão.
5. Aprovação explícita antes de retornar ao estado **GO**.

---
**Assinado:** Lovable AI - Protocolo de Governança v655.
