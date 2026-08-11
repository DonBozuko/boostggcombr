# Plano de Estabilização Técnica e Análise de Risco — v617

Reconheço o resultado da investigação anterior: a causa raiz permanece **NÃO IDENTIFICADA** (Baseline, TikTok, GTM e JivoChat retornaram limpos em ambiente controlado). Este plano foca exclusivamente na avaliação de riscos, comparação de estratégias e recomendação técnica sem realizar alterações ou novas investigações causais.

## 1. Avaliação de Riscos Técnicos (v617 - Blindagem Antidote Pro)

### A) MutationObserver Síncrono em `__root.tsx`
- **Loop de Mutações:** Risco **BAIXO**. O sanitizador já implementa uma guarda lógica `if (/[\u2063\u200B\uFEFF]/.test(text))` que impede re-processamento de texto limpo, evitando ciclos infinitos.
- **Performance & CPU:** Risco **MODERADO**. Em páginas com alto volume de mutações (como o log do Jarvis), o observer síncrono pode causar picos de processamento. A recomendação é otimizar para processar apenas `addedNodes`.
- **Conflito com TanStack Start / React:** Risco **BAIXO**. O React gerencia o Virtual DOM; mutações diretas no DOM real são detectadas pelo React na próxima reconciliação, o que poderia, em teoria, causar erros de "Node not found" se removermos elementos arbitrariamente.
- **Hidratação:** Risco **ZERO**. O observer só inicia após a montagem do componente (`useEffect`), não interferindo no HTML inicial servido pelo servidor.
- **Remoção de Conteúdo Legítimo:** Risco **BAIXO**. A regex é restrita a caracteres de controle invisíveis sem uso semântico no projeto.

### B) CSS para esconder `U+2063`
- **Viabilidade:** A regra `span:empty` **não funciona** para `U+2063`, pois o caractere é considerado conteúdo de texto pelo motor de renderização. O elemento não é tecnicamente "vazio".
- **Mascaramento:** Ocultar via CSS apenas "esconde" o problema visual, mas o caractere permanece no DOM para rastreadores e ferramentas de auditoria.

### C) Higienização do `SocialProofPopup`
- **Integridade:** Risco **NULO**. A limpeza de strings via `.replace()` antes da renderização é uma prática de defesa em profundidade e não afeta a lógica de negócio ou dados legítimos.

## 2. Comparativo de Alternativas

| Alternativa | Benefício | Risco | Impacto | Recomendação |
| :--- | :--- | :--- | :--- | :--- |
| **A) Não fazer nada** | Estabilidade absoluta; sem código extra. | Risco de detecção externa (SEO/Bots). | Baixo (visual) / Alto (SEO). | Nível: Observação. |
| **B) Proteção Mínima** | Higienização na fonte (Props/Data); Zero risco de loop. | Não detecta injeções dinâmicas de scripts externos. | Médio. | **RECOMENDADA.** |
| **C) Blindagem Pro** | Neutralização imediata de qualquer injeção no DOM. | Maior complexidade; risco de performance em mutações em massa. | Alto (Segurança). | Nível: Emergência. |

## 3. Recomendação Técnica Final

Recomendo a **Opção B (Proteção Mínima e Segura)** combinada com higienização estática.

### Por que?
1. **Prudência:** Como a causa raiz não foi identificada e o problema não é reprodutível sob demanda, implementar a Blindagem Pro (C) é usar um "canhão para matar uma mosca", introduzindo um sistema complexo de vigilância (Observer) que pode gerar efeitos colaterais de performance.
2. **Segurança:** A higienização direta nas propriedades (`SocialProofPopup`) e nos resultados de API (`Jarvis`) resolve 90% do risco sem tocar no ciclo global de renderização.
3. **Ponto Cego:** Se o caractere for injetado por um script externo *após* a renderização (ex: um beacon de rastreamento injetando um pixel invisível), a Opção B não o pegará, mas também não correremos o risco de quebrar a reconciliação do React.

**Conclusão:** Mantenha a proteção mínima síncrona nos componentes e aguarde a manifestação do caractere em logs reais de produção antes de escalar para a Blindagem Pro.

---
*Nenhuma alteração foi realizada. Aguardando aprovação.*
