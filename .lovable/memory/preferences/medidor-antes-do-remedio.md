---
name: Medidor antes do remédio (v316/v317)
description: Antes de caçar bug de comportamento, verificar se o instrumento que aponta o problema (severidade de alerta, contador, threshold) não é ele próprio o defeito.
type: preference
---
Regra nascida da v316/v317, depois de dias tratando sintoma:

1. **Alerta sem severidade explícita é bug.** `dispatchTelegramAlert` só entrega severidade
   derivada por `src/lib/alert-severity.ts`. Nunca voltar a usar `?? "critical"` como padrão:
   isso transforma sucesso em vermelho e o semáforo do admin nunca fica verde.
2. **"Mudou" só quando o valor é DIFERENTE do atual.** Reescrever o mesmo valor
   (`is_sellable=false` sobre `false`) não pode contar para freio de massa nem para alerta.
   Contar no-op cria impasse que se alimenta sozinho.
3. **Escolha entre fornecedores precisa de histerese.** Nunca `Math.min` puro: só troca o
   fornecedor vencedor se o concorrente for >5% mais barato (`SWITCH_MIN_GAIN`). Sem isso o
   custo balança a cada ciclo por causa de caches que sincronizam em horários diferentes,
   e o sistema lê ping-pong de rota como "fornecedor mudou o preço".
4. **Toda mudança em `pricing_items` fica no livro-razão** (`catalog_changes`, trigger
   `log_catalog_change`). Proibido diagnosticar oscilação de catálogo por achismo: consultar
   a tabela primeiro (campo, valor_antes, valor_depois, changed_at).

**Por quê:** 51 alertas "críticos" em 48h eram todos a mesma mensagem, e nenhum deles era
risco real. O sistema não estava quebrado — o medidor estava.
