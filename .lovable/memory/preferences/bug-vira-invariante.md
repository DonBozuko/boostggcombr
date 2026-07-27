---
name: Todo bug vira invariante automatizada
description: Sempre que um problema aparecer "do nada", criar detector permanente (invariante + teste) em vez de só corrigir o caso. Nada de caça ao tesouro manual.
type: preference
---
Regra permanente (v291). Quando um problema é descoberto por acaso (conversa, cliente, olho no painel):

1. Corrigir o caso **e** escrever a invariante que o detecta sozinho daqui pra frente.
2. A invariante vira função pura em `src/lib/*.ts` + teste em `src/__tests__/` + achado na auditoria forense (`src/services/ops-audit.server.ts`), que já alerta no Telegram e aparece no painel.
3. Se não dá pra escrever detector, o problema não está entendido — investigar mais antes de dizer "resolvido".

Invariantes de catálogo já cobertas (`src/lib/catalog-coherence.ts`): escada de preço invertida, preço unitário subindo com volume, custo fora da curva da categoria, serviço do fornecedor incompatível com o produto, teste seco desatualizado.

**Por quê:** o histórico mostra o mesmo padrão — cada conversa revelava um problema novo que ninguém procurava. Achado por acaso = defeito de instrumentação, não azar.
