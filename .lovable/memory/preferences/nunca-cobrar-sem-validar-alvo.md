---
name: Nunca cobrar sem validar o alvo
description: Regra de dinheiro v301 — além da rota (v297), o alvo (perfil) precisa existir e estar público antes de gerar cobrança de seguidores de Instagram.
type: constraint
---
1. Ordem obrigatória: preflight de ROTA (v297) → preflight de ALVO (v301) → cobrança → despacho.
2. Alvo: pacotes `p*` de Instagram (seguidores de perfil) exigem perfil existente e público. Perfil privado/inexistente = "Unable to verify your domain submission" em TODO painel SMM → estorno garantido.
3. Fail-open: timeout (5s), 429/5xx ou resposta estranha do Instagram liberam a venda. Só 404 / `user: null` / `is_private` bloqueiam.
4. Bloqueio sempre devolve código (`PROFILE_NOT_FOUND`, `PROFILE_PRIVATE`) e o front mostra via `checkoutErrorMessage()` — nunca "erro genérico".
5. Curtidas/views/outras redes não têm checagem pública confiável: não inventar veredito.

**Por quê:** o estorno de R$ 283,44 (p15k, 26/07) passou pelo preflight de rota — a rota estava boa; o perfil é que não era aceitável. Módulo puro: `src/lib/target-preflight.ts`.
