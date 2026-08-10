# Plano v601: Otimização de Performance, Estabilidade & Indexação

Este plano implementa as três recomendações aprovadas pelo Diretor para consolidar a integridade do sistema BOOSTGG em fase final.

## 1. Otimização de Checkout (Sugestão 1)
**Objetivo:** Evitar falhas prematuras (`GATEWAY_TIMEOUT`) em pacotes de alto valor durante períodos de latência externa.
- **Arquivo:** `src/lib/pedidos.functions.ts`
- **Alteração:** Aumentar o timeout de `Promise.race` no preflight de 5s para 8s, mas apenas para pedidos acima de R$ 50,00 (pacotes que exigem validação mais rigorosa e lenta dos fornecedores).

## 2. Modo Noturno de Sincronismo (Sugestão 3)
**Objetivo:** Economizar recursos do banco de dados e evitar processamento desnecessário na madrugada brasileira.
- **Arquivo:** `src/routes/api/public/hooks/sync-pricing.ts`
- **Alteração:** Adicionar lógica de verificação de horário (UTC-3). Se o horário estiver entre 02:00 e 06:00, o sincronismo só será executado se o parâmetro `?force=true` estiver presente. Caso contrário, retorna um status `202 Accepted` informando que está em Modo Noturno.

## 3. Aceleração de Indexação GSC (Sugestão 2)
**Objetivo:** Forçar o frescor do sitemap e informar o Google sobre as novas atualizações de categorias BR.
- **Arquivo:** `src/lib/gsc-ping.server.ts` (Novo) e `src/routes/api/public/hooks/sync-pricing.ts`.
- **Alteração:** 
    - Criar utilitário que realiza um ping no Google Sitemap Submission.
    - Integrar esse ping no final do `sync-pricing` (apenas em execuções diurnas e com sucesso).

## Validação Pós-Implementação
- [ ] Testar `criarPedido` com pacote barato (timeout 5s) e caro (timeout 8s).
- [ ] Validar resposta do `sync-pricing` simulando horário noturno.
- [ ] Verificar logs do Ping GSC.
