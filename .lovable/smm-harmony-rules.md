# Regras de Harmonia do Painel SMM (v383)

Documento vivo. Toda alteração no caminho do dinheiro deve obedecer a estas regras.

## 1. Ponto único por responsabilidade

| Responsabilidade | Arquivo único | Nunca duplicar |
|---|---|---|
| Ler resposta de fornecedor | `src/lib/dispatch-response.ts` | parsing de `json.error` solto |
| Elegibilidade de fornecedor (saldo/custo/margem) | `src/lib/dispatch-gates.ts` | ifs de saldo copiados em rota |
| Reserva de envio (anti dupla-entrega) | `src/lib/dispatch-claim.server.ts` | update condicional avulso |
| Escrita do desfecho | `src/lib/dispatch-commit.server.ts` | `.update(...).is(provider_order_id,null)` inline |
| Trilha forense | `src/lib/dispatch-log.server.ts` | `console.log` como prova |
| Preço | `src/lib/price-authority.server.ts` | fórmula no componente |
| Vitrine | `src/lib/shelf-authority.ts` | veto local em rota |

## 2. Ciclo fechado obrigatório de todo pedido

1. **INÍCIO** — `claimDispatch` ANTES de qualquer chamada externa (fail-closed: erro = não envia).
   Depois: portão `evaluateProviderGate` por fornecedor da cadeia rankeada.
2. **MEIO** — `dispatchByFornecedor` → captura do corpo BRUTO (sem truncar) em `dispatch_attempts_logs`,
   com `await` (worker pode morrer e matar promessa solta).
3. **FIM** — `commitDispatch` atômico. Se devolver `false`, a corrida foi perdida:
   **proibido** lançar ledger, tesouraria ou débito de carteira. Se nenhum fornecedor
   aceitou → `releaseDispatch` para o reconciliador tentar de novo.

## 3. Sucesso só existe com prova

HTTP 200 **não** é sucesso. Só é sucesso quando `interpretProviderResponse` devolve
`orderId` válido (alfanumérico, ≠ `0`, ≠ `error`). São falhas conhecidas de painéis SMM:
`{"error":...}`, `{"errors":[...]}`, `{"status":"error"}`, `{"order":0}`, HTML de WAF,
corpo vazio — todas com HTTP 200.

## 4. Volatilidade de fornecedor (IDs e preços mudam sem aviso)

- Endpoint do banco passa SEMPRE por `normalizeEndpoint` (envio **e** cancelamento).
- ID de serviço nunca é chumbado em rota: vem de `pricing_items` / `serviceIdOverride`.
- Erro de negócio (saldo, service id) → não faz retry, cai pro próximo fornecedor.
  Erro transiente (rede/5xx/429) → backoff exponencial de `retry-policy.ts`.
- 3 falhas seguidas → circuit breaker 10 min em `provider_health`.

## 5. Anti-regressão

- Mudança aditiva > refactor arriscado.
- Toda regra nova nasce com teste em `src/__tests__/` (ver `dispatch-harmony.test.ts`).
- Nada de `console.log` como auditoria: use `dispatch_attempts_logs`, `financial_ledger`
  ou `admin_audit_logs`.
- Alerta ao dono sempre em português direto: título + `PROBLEMA:` + `O QUE FAZER:`.
