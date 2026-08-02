---
name: Rota Reserva Quente (v406)
description: Todo pacote deve ter fornecedor A e B pré-validados; quem responde "tem plano B?" é src/lib/hot-standby.ts, sem régua própria.
type: feature
---
v406. O plano B existia, mas só era descoberto NA HORA em que o fornecedor A
falhava — depois do cliente pagar.

**Regra:**
- `src/lib/hot-standby.ts` (puro) é o único dono da pergunta "tem reserva?".
  Níveis: `quente` (A e B prontos), `morna` (B degradado, sai na recarga),
  `unica` (só A entrega), `nenhuma`.
- Ele NÃO reavalia catálogo/margem/saldo: consome `evaluateRoute` (v297). Criar
  filtro próprio aqui repetiria o erro da v334 (régua duplicada).
- A Bancada de Provas mede a redundância no mesmo passe (`BenchRow.redundancia`,
  `BenchRow.reserva`) e o painel avisa em amarelo os pacotes de rota única.
- Rota única é AVISO, nunca bloqueio de venda: o pacote entrega hoje.

**Trava:** `src/__tests__/hot-standby.test.ts` (família `preflight` em
`src/lib/coverage-map.ts`).
