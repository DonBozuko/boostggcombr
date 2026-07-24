---
name: Testes automatizados são gate de deploy
description: Todo fluxo que mexe com dinheiro ou entrega precisa de teste em src/__tests__; build só passa com suíte verde. Regras críticas ficam em módulos puros.
type: preference
---
Regra permanente (v243), criada depois do caso Sybele:

1. **Build bloqueado por teste vermelho.** `npm run build` e `build:dev` rodam `vitest run` antes do `vite build`. Teste falhando = não publica. Nunca remover esse gate para "destravar deploy".
2. **Fluxos cobertos obrigatoriamente** (`src/__tests__/`): trava BR + ordem de despacho, assinatura do webhook Mercado Pago, autenticação dos robôs/cron, trava de margem, e paridade vitrine × servidor.
3. **Regra crítica = função pura testável.** Lógica que decide dinheiro ou entrega não pode ficar inline dentro de um handler com acesso a banco. Extrair para módulo puro (`src/lib/critical-guards.ts`, `src/lib/mp-signature.ts`) e importar. Sem isso não dá para testar e a regressão volta.
4. **Toda correção de bug crítico nasce com teste.** Primeiro um teste que reproduz a falha, depois o fix. Sem teste, o mesmo bug volta em 3 semanas.

**Por que:** o projeto não tinha nenhum teste. Cada correção quebrava outra coisa e quem descobria era o cliente. Isso é a diferença real entre nós e operações maiores — não é time maior, é rede de proteção automática.
