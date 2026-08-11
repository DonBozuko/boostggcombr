# Plano de Transição: Auditoria para Execução e Auto-Cura (v612)

Este plano atende à demanda direta do Diretor por **execução prática**. O sistema não deve apenas apontar riscos, mas sim **reparar autonomamente** as falhas detectadas. Ativaremos o modo executor pleno em três frentes críticas.

## Mudanças propostas

### 1. Ativação do Auto-Healer (Reparo Autônomo)
- **Execução em Tempo Real:** Refatorar o  e o  para não apenas mostrar o status, mas oferecer um botão de **"Auto-Fix All"** que invoque o  em lote.
- **Sincronismo de Fornecedores:** Implementar a execução automática de troca de IDs de serviço quando a auditoria detectar que o ID do fornecedor mudou (Healer v410).

### 2. Conciliação Financeira Atômica
- **Reparo de Ledger:** Criar um script de execução em  que encontre pedidos pagos sem registro no Ledger Financeiro e execute o lançamento retroativo garantindo a integridade do caixa.
- **Despacho Travado:** Implementar o reparo automático de pedidos em status  que já possuem saldo e margem confirmados, forçando o envio à API do fornecedor.

### 3. Estabilização de Performance (Checkout)
- **Reparo de Timeout:** Otimizar o webhook do Mercado Pago () para responder  imediatamente e delegar o processamento pesado para um worker em background, evitando que o MP marque o endpoint como falho por demora.

### 4. Transparência de Execução
- **Log de Reparos:** Adicionar uma aba "Execuções Recentes" no painel Admin para mostrar o que o sistema consertou sozinho nas últimas 24h, provando que a execução está ativa.

## Detalhes técnicos
- **RPC SQL:** Criação de funções SQL no Supabase para correções em massa (bulk fixes) para evitar timeouts de funções edge.
- **Background Processing:** Uso extensivo de  para garantir que o reparo continue rodando após a resposta da requisição.
- **Margem Dinâmica:** Ajuste fino no  para que ele mesmo aplique o  se detectar drift acima de 2%.

## Próximos passos
1. Implementar o botão de "Reparo Total" no Semáforo do Jarvis.
2. Ativar a fila de processamento assíncrono no Webhook do Mercado Pago.
3. Executar a primeira varredura de auto-cura no Ledger Financeiro.
