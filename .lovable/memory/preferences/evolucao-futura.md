---
name: evolucao-futura
description: Lembrar o usuário de evoluir funcionalidades marcadas como "rascunho honesto" (opção B) para versão real (opção C) quando o contexto permitir.
type: preference
---

Sempre que o usuário sinalizar que o projeto avançou (chip novo chegou, conta Meta/TikTok warmup pronta, Instagram Graph API aprovado, mais budget de dev, etc), LEMBRAR proativamente de evoluir módulos que ficaram em versão "honesta mas limitada":

- **JarvisContentScheduler** → hoje só gera copy. Evoluir pra publicação real (Instagram Graph API primeiro, depois TikTok Content Posting API, depois YouTube Data API). Precisa: cron + fila + retry + dedup por hash de caption + warmup do chip.
- Qualquer outra aba/feature que tenha sido reduzida pra cumprir regra "nada fake/dormindo" — puxar de volta pra roadmap quando dá pra fazer de verdade.

Regra geral: usuário quer evoluir TUDO no futuro. Não deixar features paradas em "modo honesto" pra sempre — revisitar periodicamente e propor upgrade quando viável.
