---
name: Motor Anti-Alucinação (v398)
description: Toda auditoria e toda afirmação técnica começam rodando `npm run audit`; alarme falso se corrige calibrando o medidor, nunca inventando trabalho.
type: preference
---
Protocolo completo em `.lovable/anti-hallucination.md`.

1. **Fato antes de frase** — `npm run audit` (scripts/audit.mjs) lê `src/`
   inteiro e grava `.lovable/audit-report.md`. Nenhuma afirmação de "está ok"
   sai sem esse relatório na mão.
2. **Gravidade define ciclo** — bloqueante derruba o build; atenção vira ciclo
   aprovado pelo dono; nota é dívida registrada.
3. **Alarme falso é defeito meu** — calibro a checagem, não invento correção
   para zerar número.
4. **Consertar antes de medir** — Autoridade de Preço roda antes de qualquer
   julgamento de margem.
5. **Uma vez só** — toda correção nasce com teste; sintoma repetido 2x = refaz
   o mecanismo.
6. Ciclo fecha com: audit sem bloqueante + tsgo + vitest verdes.

**Por quê:** o retrabalho vinha de julgar o sistema de memória e de agir sobre
alerta vencido. Medidor executável mata as duas causas.
