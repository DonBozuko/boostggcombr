# Fechamento operacional BOOSTGG

## Verdade atual comprovada

- **PIX não está 100% funcional:** o backend cria uma preferência de checkout e devolve `init_point` como se fosse o código PIX. O QR base64 é sempre vazio; portanto, o modal mostra imagem inválida e o “copia e cola” recebe uma URL, não um payload PIX `000201...`.
- **Cartão está visível, mas quebrado:** o frontend envia `metodo: "cartao"`, porém o validador descarta esse campo, o backend sempre segue o caminho PIX e nunca devolve `checkoutUrl`. Cada tentativa ainda pode gerar um pedido pendente sem concluir o pagamento.
- **Entrega automática existe e está protegida:** webhook, contingência, reconciliador, SLA, smart routing e claim/commit atômicos cobrem pagamento até fornecedor, com travas contra dupla entrega. Ainda será validado o comportamento real dos cron jobs e a janela residual entre envio ao fornecedor e commit.
- **O Jarvis pode dar falso verde:** componentes assumem verde quando a telemetria falha; alertas críticos deixam de contar após 20 minutos mesmo sem resolução; ausência de saldo também pode ser interpretada como operacional.
- **Dados reais:** há 87 pedidos registrados como PIX e nenhum como cartão. Nos últimos 30 dias houve 22 PIX gerados e 10 convertidos. A última tentativa bloqueada foi corretamente recusada por perfil privado. Existem 147 alertas em 14 dias, sendo 34 críticos/erros, apesar de zero incidentes persistidos.
- **Auditoria de UX/SEO:** preço único server-side e proteção da sincronização pública foram corrigidos. Permanecem sem prova final: experiência mobile, privacidade no checkout, anti-enumeração da consulta e saúde individual dos fornecedores.

## Execução P0 — compra real

1. Separar explicitamente `pix` e `cartao` no contrato de criação do pedido.
2. Para PIX, criar pagamento PIX real no Mercado Pago e retornar somente os campos oficiais `qr_code` e `qr_code_base64`.
3. Para cartão, criar Checkout Pro habilitado para cartão, persistir `metodo_pagamento = cartao` e devolver uma URL válida de checkout.
4. Impedir que falha no gateway deixe pedido órfão enganando funil e Jarvis; registrar estado/erro coerente para recuperação.
5. Adicionar idempotência por tentativa para impedir pedidos duplicados em duplo clique/retry.
6. Aplicar retry limitado apenas a erros transitórios do gateway, sem repetir cobrança criada.

## Execução P0 — verdade operacional

1. Estado padrão do semáforo será `UNKNOWN`, nunca verde sem telemetria válida.
2. Incidente/alerta crítico permanecerá vermelho até resolução comprovada, não apenas até envelhecer 20 minutos.
3. Ausência de saldo, fornecedor ou telemetria será `UNKNOWN/DEGRADED`, não “operacional”.
4. Consolidar alertas por causa e ciclo de vida, sem apagar evidência nem acumular repetição.

## Validação obrigatória

- Teste de contrato PIX: payload copia-e-cola válido e QR base64 não vazio.
- Teste de contrato cartão: método aceito, persistido e `checkoutUrl` retornado.
- Testes de falha: timeout, 429, 5xx, perfil privado, duplo clique e gateway indisponível.
- Teste de idempotência webhook + contingência + reconciliador: uma cobrança gera no máximo uma entrega e um lançamento financeiro.
- E2E no navegador em desktop e mobile para PIX e cartão, sem erros de console.
- Verificação dos cron jobs, últimas execuções, filas, pedidos pagos travados, fornecedores e circuit breakers.
- Reexecução da suíte completa e auditoria automatizada.
- SEO: HTML inicial com preço real, JSON-LD coerente, metadados, canonical, robots e páginas principais.

## Critério de término

O projeto só será declarado pronto quando houver prova simultânea de: PIX real utilizável, cartão abrindo checkout, pagamento aprovado processado uma vez, entrega despachada uma vez, ledger registrado uma vez, recuperação automática operante, Jarvis sem falso verde e SEO sem regressão. Até lá, o estado correto é **NÃO APROVADO PARA FECHAMENTO**.