# Auditoria de Freshness Atômica (v620)

## 1. Diagnóstico da Implementação Atual
A implementação de `dateModified` está localizada em `src/routes/blog.$slug.tsx`.

### Evidência Técnica
```typescript
// src/routes/blog.$slug.tsx
dateModified: () => new Date().toISOString().split('T')[0]
```
No `JSON-LD`:
```typescript
dateModified: (typeof post.dateModified === 'function' ? post.dateModified() : post.dateModified) ?? post.datePublished
```

### Respostas aos Questionamentos do Usuário
1.  **Cálculo Atual:** É gerado em runtime no cliente/servidor (SSR) usando `new Date()`. Isso resulta na data do dia atual (UTC) em que a página é acessada.
2.  **Mudança Diária:** Sim. Como a função é executada a cada renderização/acesso, o Googlebot verá uma data diferente a cada dia que rastrear a página, mesmo sem alterações no `POSTS` ou no `body`.
3.  **Data Real de Modificação:** Não existe no código atual. O objeto `Post` define apenas `datePublished` de forma estática.
4.  **Correspondência com a Realidade:** Não corresponde. A data reflete o momento do acesso, não o momento da última edição editorial.
5.  **Misleading/Fake Freshness:** **Sim.** Mecanismos de busca (Google) podem interpretar isso como uma tentativa de manipular o sinal de "frescor" do conteúdo sem oferecer valor novo.
6.  **Interpretação como Artificial:** Altamente provável se a data mudar diariamente enquanto o conteúdo (hashes de texto) permanecer idêntico. O Google é sofisticado o suficiente para comparar o conteúdo textual entre rastreios.
7.  **Implementação Correta:** A data de modificação deve ser um campo estático no objeto de dados do artigo, atualizado manualmente apenas quando houver mudanças significativas (editorial, adição de FAQ, atualização de preços/estratégias).

## 2. Comparativo de Alternativas
-   **A) Data atual automática (Atual):** Risco de penalização por "spam de freshness". Não reflete a realidade.
-   **B) Data real de modificação:** Ideal, mas exige controle manual rigoroso.
-   **C) Data modificada somente sob alteração real:** A melhor prática de SEO. Garante que o Google entenda quando o conteúdo foi realmente enriquecido.

## 3. Classificação
🔴 **Implementação inadequada**

---

## 4. Plano de Correção (v620)

### Causa Raiz
Uso de função dinâmica `() => new Date()` no campo `dateModified` do objeto de metadados dos posts.

### Plano de Ação
1.  **Refatoração do Type:** Alterar o tipo `dateModified` para aceitar apenas `string` opcional, removendo o suporte a funções dinâmicas.
2.  **Fixação de Datas:** Substituir as funções dinâmicas nos `POSTS` por strings estáticas representando a última data de alteração real (ex: a data em que a v619 foi aplicada).
3.  **Simplificação do JSON-LD:** Remover a lógica de execução de função no componente de SEO, usando o valor direto.

### Benefícios
-   Elimina o risco de penalização por manipulação de frescor.
-   Alinha o sistema com as diretrizes de E-E-A-T do Google.
-   Mantém a integridade semântica dos dados estruturados.

**Aguardando aprovação para execução.**
