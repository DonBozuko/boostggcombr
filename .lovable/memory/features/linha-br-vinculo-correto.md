---
name: Vínculo correto da linha BR de seguidores
description: Serviços válidos (BR + reposição) para os pacotes br-p* e br-pro*, e por que vínculo errado derruba a vitrine
type: feature
---

# Linha BR de seguidores (Instagram)

O roteamento (v245/v246) **descarta qualquer pacote BR sem serviço com reposição**.
Vincular um `br-*` a um serviço Global ou "No Refill" faz o pacote cair da vitrine
com veto "nenhum fornecedor habilitado" — sem erro visível, só venda perdida.

## Vínculos válidos

- **Linha econômica `br-p*`** (br-p100 … br-p10k): SMMhype `#4312` (BR, Refill, ~US$2.11/1k).
  Reservas: Provider4 `#1030`, SMMPainel `#469`.
- **Linha premium `br-pro*`**: SMMhype `#15240` (Elite BR, Refill 30d, ~US$8.10/1k) +
  reserva SMMpainel `#469` (BR, R30). O antigo `#8431` **sumiu do painel** (drift do
  fornecedor) — não usar.

**Nunca** vincular `br-*` ao SMMhype `#15057` — é Global e sem reposição. Foi a causa
raiz dos 7 vetos da v642 e dos 6 vetos `br-pro*` da v646.

**v646 — quarentena automática:** o teste seco (`src/lib/dry-run.server.ts`) agora
zera o vínculo (manual ou auto) cujo serviço reprova na trava BR/tóxico, para o
auto-resolver rebindar sozinho. Antes, ID manual ruim prendia o pacote para sempre.


## Verificação rápida

Pacote BR sumiu da vitrine → conferir `shelf_vetoes` e se o `*_service_id` aponta
para serviço com `refill = true` e nome contendo marcação BR/Brazil.
