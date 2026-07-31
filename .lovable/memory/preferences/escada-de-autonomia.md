---
name: Escada de Autonomia (v391)
description: Toda família de falha declara nível 1/2/3 em src/lib/autonomy-ladder.ts — detector sem executor é defeito nosso, não trabalho do dono.
type: preference
---
Causa raiz de "todo dia aparece erro novo": 20+ detectores, 3 remédios.
Detector sem executor não conserta nada — só transfere trabalho pro dono.

## Níveis (declarados em `src/lib/autonomy-ladder.ts`)
1. **Conserta sozinho, sempre** — nada de dinheiro saindo (religar pacote,
   refazer vínculo, fechar entregue, limpar fantasma de Pix, reconciliar,
   quarentena de fornecedor). Exige arquivo executor real.
2. **Conserta com teto** — exige executor + teto declarado + flag de desligar
   (hoje: reposição automática, desligada).
3. **Só alerta** — dinheiro saindo (estorno, recarga de fornecedor). Exige flag.

## Travas
- `src/__tests__/autonomy-ladder.test.ts` quebra o build se: nível 1 sem
  executor, executor citado que não existe no disco, nível 2 sem teto/flag,
  qualquer ação sem rollback, ou família fora do `coverage-map`.
- `ops-audit` levanta `AUTONOMIA_INCOMPLETA` quando sobra conserto manual.

## Regra
Feature nova que gera alerta nasce declarando seu nível aqui. Alerta sem nível
declarado é dívida.
