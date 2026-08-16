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
- **Linha premium `br-pro*`**: SMMhype `#8431` (~US$7.35/1k).

**Nunca** vincular `br-*` ao SMMhype `#15057` — é Global e sem reposição. Foi a causa
raiz dos 7 vetos corrigidos na v642.

## Verificação rápida

Pacote BR sumiu da vitrine → conferir `shelf_vetoes` e se o `*_service_id` aponta
para serviço com `refill = true` e nome contendo marcação BR/Brazil.
