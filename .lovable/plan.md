# Plano v613: Execução e Estabilização Crítica (Modo Executor)

Este plano foca na **AÇÃO DIRETA** para resolver os gargalos identificados na auditoria v612, transformando o sistema de "observador" em "executor autônomo".

## 1. Jarvis Lie Detector v53 (Blindagem de Falso Positivo)
- **Problema:** Alertas antigos ou "fantasmas" (latência de cron) travam o piloto automático e o Jarvis.
- **Ação:** 
    - Refatorar `src/lib/jarvis-detector-mentiras.functions.ts` para usar uma janela de look-back mais inteligente.
    - Se o `reconciler_alive` for `true`, avisos de `smoke_alive` em atraso não devem setar `blockDeploy = true`.
    - Garantir que alertas prefixados com "✅ RESOLVIDO" sejam sumariamente ignorados no cálculo de severidade.

## 2. Motor de Auto-Cura (Reparo Atômico de Pedidos)
- **Problema:** O botão de auto-cura hoje apenas resolve o alerta, mas não "cura" o pedido (não tenta o despacho novamente).
- **Ação:**
    - Modificar `src/lib/jarvis-resolve.functions.ts`.
    - Integrar a chamada ao `dispatchOrder` (ou reconciliador manual) para todos os pedidos identificados como "travados" durante o processo de resolução.
    - Registrar o sucesso da cura no `admin_audit_logs`.

## 3. Webhook Assíncrono (Robustez v612+)
- **Problema:** Riscos de perda de contexto no `waitUntil` em deploys Edge.
- **Ação:**
    - Refinar `src/routes/api/public/mp-webhook.ts` para garantir que o `job` assíncrono tenha acesso persistente às variáveis de ambiente e segredos, mesmo após o envio da resposta 200.

## 4. Estabilização de Margem (Guardian)
- **Problema:** Oscilação cambial rápida pode causar prejuízo em picos de venda.
- **Ação:**
    - Validar `src/lib/margin-guardian.ts` para garantir que o `MARGIN_EPSILON` de 1.2% esteja sendo aplicado em todas as rotas de checkout (PIX e Cartão).

## Detalhes Técnicos
- **Prioridade:** 1. Pedidos Travados (Dinheiro parado) > 2. Jarvis (Operação) > 3. Webhook (Estabilidade).
- **Risco:** Baixo. As mudanças são aditivas e focadas em fallbacks.
