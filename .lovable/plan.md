# Plano de Transição: Da Auditoria para Execução e Auto-Cura (v612)

O sistema BOOSTGG está consolidado em termos de auditoria. Agora, moveremos o foco para a **execução autônoma e reparo proativo**, garantindo que o sistema não apenas aponte problemas, mas os resolva automaticamente.

## Mudanças propostas

### 1. Ativação do Motor de Auto-Cura (Auto-Healer)
- **Execução Proativa:** Integrar o `resolveJarvisAlerts` diretamente no ciclo de monitoramento do `AdminHealthSemaphore`. Se uma falha de "drift de ID" ou "serviço desconectado" for detectada, o sistema tentará o reparo imediato.
- **Botão de Reparo Total:** Adicionar no painel administrativo uma função de "Conserto Geral" que varre inconsistências de banco, preço e despacho em um único lote.

### 2. Blindagem e Reparo de Fluxos Críticos
- **Webhook Resiliente:** Refatorar o `mp-webhook.ts` para processamento assíncrono real usando `waitUntil`. O sistema responderá `200 OK` ao Mercado Pago imediatamente e processará o provisionamento/despacho em background, eliminando timeouts.
- **Conciliação Atômica de Ledger:** Implementar reparo automático para pedidos "Pagos" sem entrada no `admin_treasury`.

### 3. Estabilização de Margem e Preço
- **Convergência Automática:** Refinar o `price-authority.server.ts` para aplicar preços em rampa de forma mais agressiva quando a margem estiver em risco real.

### 4. Transparência de Ação
- **Logs de Execução:** Criar uma seção "Ações Autônomas" no Admin, listando o que o sistema consertou sozinho (reparos de pedido, ajustes de ID, reconexão de API).

## Detalhes técnicos
- **Background Execution:** Uso de `waitUntil` para garantir conclusão pós-request.
- **Autonomia Ladder:** Atualização do `autonomy-ladder.ts` para elevar falhas críticas para Nível 1 (Conserto Automático).
- **Idempotência:** Travas de banco em `bulk_update_pricing` para evitar conflitos.

## Próximos passos
1. Implementar o processamento em background no webhook do Mercado Pago.
2. Ativar o reparo automático de IDs de serviço no Jarvis.
3. Consolidar o painel de "Ações Autônomas" no Admin.
