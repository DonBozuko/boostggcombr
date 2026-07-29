---
name: ID de fornecedor é descartável (v362)
description: Quando o ID do fornecedor some ou muda, o vínculo é refeito por impressão digital (rede+produto) + faixa de quantidade + custo. Nunca por nome parecido com o pacote.
type: constraint
---
Fornecedor troca/apaga ID o tempo todo. Isso NÃO pode derrubar pacote da vitrine.

Regra:
- Verdade do vínculo = intenção (rede + o que entrega) + faixa min/max + custo aceitável.
- ID é só referência temporária.
- Substituto sai de `src/lib/service-substitute.ts` (`pickSubstituteService`), usando
  `name_sig` de `service_fingerprints`. Proibido voltar ao match por
  `name.includes(pacote)` — nunca casava e zerava vínculo bom.
- Sem candidato de MESMA intenção que entregue a quantidade → rota fica vazia.
  Nunca chutar produto diferente (é o que vira estorno).
- Visibilidade: aba Auditoria do admin → "Raio-X do fornecedor (48h)" mostra
  trocas de ID, preço, custo e troca de produto por trás do mesmo ID.
