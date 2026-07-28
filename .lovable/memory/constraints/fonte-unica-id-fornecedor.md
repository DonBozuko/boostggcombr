---
name: Fonte única de verdade para IDs de fornecedor
description: Proibido ID de serviço chumbado no código; catálogo vivo do fornecedor manda, e todo vínculo passa pelo portão bind-guard
type: constraint
---
Nenhum ID de serviço de fornecedor pode ser tratado como verdade a partir de
constante no código. O fornecedor reaproveita número: o mesmo ID vira outro
produto sem aviso (ex.: 18855 era "Instagram Views" e virou "Instagram Likes").

Regra:
- A verdade é o catálogo vivo (`services_cache` e irmãs), nunca a constante.
- Toda escrita em qualquer coluna `*_service_id` / `*_auto_id` de `pricing_items`
  passa por `guardBindings` (`src/lib/bind-guard.server.ts`). Sem exceção.
- Constante no código só pode ser semente/candidata — nunca gravada direto.
- ID ausente do catálogo é cortado como fantasma SÓ quando a leitura daquele
  fornecedor veio inteira e recente (≥200 serviços e <6h). Leitura parcial ou
  velha nunca apaga vínculo bom.

**Why:** duas fontes de verdade criaram o loop eterno de alerta: a auditoria
desvinculava o produto errado e o motor de preço regravava a constante velha no
ciclo seguinte. Alerta infinito, e risco real de entregar produto errado ao
cliente.

**How to apply:** ao criar qualquer caminho novo que grave ID de serviço,
plugar no portão antes do upsert e cobrir com teste em
`src/__tests__/bind-guard.test.ts`.
