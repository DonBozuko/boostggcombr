---
name: Pacote :br só pode usar serviço brasileiro real
description: Regra de catálogo — qualquer pacote com categoria terminada em :br só pode ser vinculado a serviço de fornecedor com "brasil/brazil/brasileir/🇧🇷" no nome, e nunca a serviço marcado como queda/não compre.
type: constraint
---
1. Categoria `*:br` → o serviço do fornecedor PRECISA ter brasil/brazil/brasileir/🇧🇷 no nome ou categoria.
2. Nunca vincular serviço cujo nome contenha "não compre", "queda de 100%", "drop 100" — mesmo em pacote não-BR.
3. O dry-run (`src/lib/dry-run.server.ts`, v240) valida isso e pausa o pacote automaticamente.
4. IDs manuais (`*_service_id`) não passavam por validação antes da v240 — sempre auditar depois de mexer neles.

**Why:** cliente comprou TikTok Brasil e recebeu seguidores árabes/indianos com queda de 100% (verified 986 e smmpainel 124 eram serviços internacionais). Risco de chargeback e Reclame Aqui.
