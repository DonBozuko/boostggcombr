---
name: Prova contínua de entrega (Bancada Autônoma)
description: v323 — o sistema testa sozinho todos os pacotes contra os fornecedores a cada 2h, grava veredito no banco, corrige o que dá e só chama o dono quando falta dinheiro
type: feature
---
Verde só vale se foi provado agora, pelo próprio sistema, e está gravado.

1. Robô `bench-sweep-2h` (cron 17 */2 * * *) chama `/api/public/hooks/bench-sweep`.
2. `src/services/bench-autonomo.server.ts` roda a MESMA decisão do checkout
   (`rankProvidersByCost` + `evaluateRoute`) em TODOS os pacotes, sem cobrar
   e sem despachar.
3. Grava tudo em `bench_runs` (resumo) e `bench_findings` (pacote a pacote).
   O painel só LÊ isso — nunca recalcula.
4. Corrige sozinho: bloqueio ESTRUTURAL (sem ID/sem fornecedor) sai da vitrine
   com prefixo `BANCADA:`; volta sozinho quando a rota é provada de novo.
   Saldo e margem NÃO derrubam prateleira (transitório, regra v297).
5. Falha nossa (erro ao avaliar) nunca vira veredito contra o pacote nem pausa.
6. Alerta em português com "PROBLEMA / O QUE FAZER" e cooldown de 12h por
   assinatura (v319). Só chama o dono quando precisa de recarga ou mão humana.

**Por quê:** teste que depende de humano clicar não protege ninguém. Entre um
clique e outro o fornecedor troca ID, custo ou fica sem saldo — e quem descobre
é o cliente pagando e sendo estornado.
