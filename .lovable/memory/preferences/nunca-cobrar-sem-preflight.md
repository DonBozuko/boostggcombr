---
name: Nunca cobrar sem preflight de rota
description: Regra de dinheiro — nenhuma cobrança (Pix ou cartão) pode ser gerada sem antes provar, ao vivo, que existe fornecedor capaz de entregar aquele pacote agora.
type: constraint
---
Regra absoluta (v297):

1. **Ordem obrigatória**: preflight de rota → cobrança → despacho. Nunca cobrar primeiro e descobrir depois.
2. O preflight (`src/lib/route-preflight.ts` puro + `.server.ts`) roda os MESMOS filtros do despacho: ID fantasma (v296), faixa min/max (v286), BR+refill (v245), sanidade de custo (v294), saldo e margem mínima (v216). Se divergirem, é bug — unificar, não duplicar.
3. **Fail-open**: erro ou timeout (>7s) do preflight libera a venda. O preflight nunca pode ser causa de venda perdida.
4. **Fail-closed com veredito**: se avaliou e não há rota, bloqueia a cobrança e avisa o dono em português.
5. Bloqueio **estrutural** (nenhum ID válido) marca `is_sellable=false` → pacote sai da vitrine sozinho e volta pelo auto-resolver. Bloqueio por saldo/margem NÃO derruba a prateleira (é transitório).
6. Estorno automático continua reservado a falha `permanent` (v296). Falha temporária = parqueia e retenta.

**Por quê:** os reembolsos reais (p15k R$283,44 e kf2k R$18,00) passaram na checagem estática de flags do banco e só falharam depois de cobrar. Flag de banco envelhece; fornecedor troca ID e preço o tempo todo. A única defesa real é verificar no instante da cobrança.
