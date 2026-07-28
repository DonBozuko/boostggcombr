---
name: Markup decrescente por custo (v328)
description: Regra de preço — múltiplo de lucro cai conforme o custo absoluto do fornecedor sobe; teto de vitrine aperta em ticket alto; revenda acompanha o piso
type: feature
---

## Por que existe
Multiplicador fixo por quantidade (até 12x) matava categorias de custo alto
(YouTube, Telegram, tráfego): 1k inscritos ficava R$ 624 quando o mercado cobra
R$ 120–200. Ninguém comprava. Custo baixo (Instagram) não tinha o problema.

## Regra (fonte única: `src/lib/margin-guardian.ts`)
Markup máximo por custo absoluto do fornecedor (interpolação logarítmica):

| custo BRL | múltiplo |
|-----------|----------|
| ≤ 5       | 5,0x     |
| 50        | 3,5x     |
| 300       | 2,6x     |
| ≥ 1000    | 2,0x     |

O escalonamento por quantidade (`tierFactor`, 5x→12x) continua valendo, mas
**nunca ultrapassa** o teto do custo: `min(quantidade, custoTier)`.

## Teto de vitrine (`src/lib/price-unit-curve.ts`)
`showcaseCap(precoJusto)`: 1,6x até R$ 50 → 1,05x a partir de R$ 500.
Ticket alto converge para o preço justo; isca barata mantém o prêmio.

## Revenda (`src/lib/reseller-pricing.ts`)
Piso de revenda = 62,5% do piso de varejo do mesmo custo (proporção histórica
2,5 ÷ 4). Sem isso, pacote caro zerava o desconto e sumia da revenda.

## Impacto medido (120 dias de vendas reais)
Os pacotes que vendem (p50, p100, p150, p200, p300, tf100, fl500, kf100) ficam
**inalterados**. Só cai o que nunca vendeu por estar caro demais.
Trava de regressão: `src/__tests__/cost-tier-markup.test.ts`.
