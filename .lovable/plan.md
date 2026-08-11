# Plano de Transição: Da Auditoria para Execução e Auto-Cura (v612)

O sistema BOOSTGG está consolidado em termos de auditoria. Agora, moveremos o foco para a **execução autônoma e reparo proativo**, garantindo que o Tech Lead não apenas aponte problemas, mas os resolva sem intervenção manual.

## Mudanças propostas

### 1. Ativação do Motor de Auto-Cura (Auto-Healer)
- **Execução Proativa:** Integrar o `resolveJarvisAlerts` diretamente no ciclo de monitoramento do `AdminHealthSemaphore`. Se uma falha de "drift de ID" ou "serviço desconectado" for detectada e tiver nível de autonomia 1 ou 2, o sistema executará o reparo imediatamente.
- **Botão de Reparo Total:** Adicionar no painel administrativo uma função de "Conserto Geral" que varre inconsistências de banco, preço e despacho em um único lote de execução.

### 2. Blindagem e Reparo de Fluxos Críticos
- **Webhook Resiliente:** Refatorar o `mp-webhook.ts` para processamento assíncrono. O sistema responderá imediatamente ao Mercado Pago e executará o provisionamento e o despacho em background, eliminando timeouts de rede que travam a entrega.
- **Conciliação Atômica de Ledger:** Implementar reparo automático para pedidos "Pagos" que não possuem entrada correspondente no `admin_treasury`, garantindo integridade financeira total sem auditoria manual.

### 3. Estabilização de Margem e Preço
- **Convergência Automática:** Refinar o `price-authority.server.ts` para que ele não apenas planeje, mas execute a aplicação de preços em rampa (v591) de forma mais agressiva quando a margem estiver em risco real (lucro < 10%).

### 4. Transparência de Ação
- **Logs de Execução:** Criar uma seção "O que eu consertei hoje" no Admin, listando ações autônomas (reparos de pedido, ajustes de ID, reconexão de API) para que o Diretor veja a execução em tempo real.

## Detalhes técnicos
- **Background Execution:** Uso de `context.waitUntil` em todas as server functions de webhook e reparo para garantir conclusão pós-request.
- **Autonomia Ladder:** Atualização do `ACOES` em `autonomy-ladder.ts` para elevar as falhas de "entrega pendente" para Nível 1 (Conserto Automático).
- **Idempotência Reforçada:** Travas de banco em `bulk_update_pricing` para evitar conflitos durante execuções simultâneas de auto-cura.

## Próximos passos
1. Implementar o processamento em background no webhook do Mercado Pago.
2. Ativar o reparo automático de IDs de serviço no Jarvis.
3. Consolidar o painel de "Ações Autônomas" no Admin.
