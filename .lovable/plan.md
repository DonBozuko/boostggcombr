# Plano de Estabilização Técnica e Análise de Risco — v617

Reconheço o resultado da investigação anterior: a causa raiz permanece **NÃO IDENTIFICADA** (Baseline, TikTok, GTM e JivoChat retornaram limpos em ambiente controlado). Este plano foca na avaliação de riscos, comparação de estratégias e recomendação técnica para neutralizar o caractere invisível `U+2063` com o menor impacto sistêmico possível.

## 1. Avaliação de Riscos Técnicos (v617 - Blindagem Antidote Pro)

### A) MutationObserver Síncrono em `__root.tsx`
- **Loop de Mutações:** Risco **BAIXO**. O sanitizador implementa uma guarda lógica `if (/[\u2063\u200B\uFEFF]/.test(text))` que impede re-processamento de texto já limpo, evitando ciclos infinitos.
- **Performance & CPU:** Risco **MODERADO**. Em páginas com alto volume de mutações (como o log do Jarvis ou dashboards dinâmicos), o observer síncrono pode causar overhead. É necessário otimizar para processar apenas `addedNodes` e não o `body` inteiro repetidamente.
- **Conflito com React/TanStack:** Risco **BAIXO**. Embora mutações diretas no DOM real não sejam recomendadas em React, a alteração de `textContent` é geralmente segura. O risco reside na remoção de nós (`parent.remove()`), que pode causar erros de "NotFoundError" durante a reconciliação do React.
- **Hidratação:** Risco **ZERO**. O observer é instanciado em um `useEffect`, garantindo que ele só atue após a hidratação completa.
- **Remoção de Conteúdo Legítimo:** Risco **BAIXO**. Os caracteres visados (`U+2063`, `U+200B`, `U+FEFF`) são caracteres de controle sem valor semântico no projeto.

### B) CSS para esconder `U+2063`
- **Viabilidade:** A regra `span:empty` **não é confiável** para este caso. O caractere `U+2063` (Invisible Separator) é tecnicamente um nó de texto; portanto, o elemento não é considerado vazio pelo motor de CSS.
- **Mascaramento:** Esconder via CSS apenas oculta o sintoma visual, mantendo o caractere presente no DOM para crawlers e bots, o que não resolve o risco de SEO.

### C) Higienização do `SocialProofPopup`
- **Segurança:** Risco **NULO**. Implementar uma função de sanitização nas strings de entrada é a abordagem mais segura e atômica, pois não interfere no DOM global.

## 2. Comparativo de Alternativas

| Alternativa | Benefício | Risco | Impacto | Recomendação |
| :--- | :--- | :--- | :--- | :--- |
| **A) Não fazer nada** | Estabilidade total; sem código extra. | Risco de detecção externa (SEO/Auditoria). | Baixo (Operacional) / Alto (SEO). | Nível: Observação. |
| **B) Proteção Mínima** | Higienização na fonte (Props/Data); Risco zero de loops. | Pode não pegar injeções dinâmicas de scripts externos 3rd-party. | Médio. | **RECOMENDADA.** |
| **C) Blindagem Pro** | Neutralização agressiva e em tempo real de qualquer injeção. | Maior complexidade; risco de performance. | Alto (Segurança). | Nível: Emergência. |

## 3. Detalhes Técnicos da Recomendação (Opção B)

A **Opção B (Proteção Mínima e Segura)** é a recomendada por ser a mais equilibrada diante de uma causa raiz não identificada.

### O que será feito:
1. **Sanitização na Fonte:** Criar um utilitário de limpeza de strings e aplicá-lo nos componentes que renderizam dados dinâmicos (`SocialProofPopup.tsx` e `JarvisDetectorMentiras.tsx`).
2. **Refino do Sanitizador Global:** Manter a versão atual baseada em `requestIdleCallback` no `__root.tsx`, mas melhorar a regex para ser mais seletiva.
3. **Evitar Observer Síncrono:** Não implementar o `MutationObserver` síncrono neste estágio para evitar riscos de performance e regressões no React.

**Por que:** Esta abordagem elimina o caractere onde ele é mais provável de aparecer (dados dinâmicos) sem comprometer a estabilidade do orquestrador global do projeto.

---
*Nenhuma alteração foi realizada. Este plano é para análise e aprovação.*
