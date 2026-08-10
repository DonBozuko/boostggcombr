# Auditoria Forense v597 — Plano de Dominação Global (Roadmap 90 Dias)

## 1. Visão Geral (Scorecard)
*   **Nota Geral:** 785/1000
*   **SEO Técnico:** 850/1000 (Metadados e Sitemaps íntegros, mas falta frescor)
*   **Performance:** 910/1000 (Core Web Vitals excelentes pós-limpeza Vite)
*   **UX/UI:** 720/1000 (Confiança pode ser ampliada com provas sociais dinâmicas)
*   **Conversão (CRO):** 680/1000 (Checkout rápido, mas fricção no pre-warming e margem)
*   **Autoridade:** 450/1000 (Dependência de tráfego direto/brand, perfil de backlinks iniciante)
*   **Conteúdo:** 600/1000 (Faltam entidades semânticas e profundidade EEAT)
*   **Segurança:** 950/1000 (Blindagem MCP v425 e RLS ativos)

---

## 2. Roadmap Executivo (90 Dias)

### Mês 1: Estabilização e Freshness (Foco: Recuperar GSC)
*   **Semana 1:** Implementação do **Freshness Authority (v598)**. Dinamizar `dateModified` em todas as 63 rotas e injetar entidades semânticas via JSON-LD.
*   **Semana 2:** Auditoria de **Monotonicidade de Escada**. Eliminar definitivamente inversões de preço no checkout e vitrine.
*   **Semana 3:** **Operação Link Clean.** Identificar e corrigir 404s internos e cadeias de redirecionamento em rotas legadas.
*   **Semana 4:** Ativação do **Canary Auto-Healing**. O sistema deve testar o roteamento de fornecedores antes de expor pacotes na vitrine.

### Mês 2: Autoridade e EEAT (Foco: Conteúdo e Backlinks)
*   **Semana 5-6:** Expansão da **Autoridade de Tópico**. Criar 10 páginas de pilar (Hubs) focadas em entidades SMM (Instagram, TikTok, YouTube) com conteúdo profundo (>2000 palavras).
*   **Semana 7-8:** **Digital PR Boost.** Plano de aquisição de 5 backlinks de alta autoridade (DR > 50) em portais de tecnologia/marketing.

### Mês 3: Conversão e IA (Foco: CRO e GEO/AEO)
*   **Semana 9-10:** **IA Optimization (GEO).** Estruturar o site para ser citável pelo ChatGPT/Gemini através de fragmentos de resposta (Answer Boxes).
*   **Semana 11-12:** **Checkout Sem Fricção.** Eliminar o delay de 1500ms no Pix através de pre-allocation assíncrona e contingência transparente.

---

## 3. Backlog de Ações Imediatas

| Prioridade | Ação | Causa Raiz | Impacto | Tempo |
| :--- | :--- | :--- | :--- | :--- |
| **CRÍTICO** | Corrigir Drift de Câmbio 1.5% | Drift <1% travando vitrine | Perda de vendas | 2h |
| **ALTO** | Dinamizar ratingValue/reviewCount | Conteúdo estático no GSC | Queda de CTR | 4h |
| **ALTO** | Limpar IDs de Fornecedores Órfãos | API 404 em pacotes antigos | Falha na entrega | 3h |
| **MÉDIO** | Implementar Open Graph Dinâmico | Imagens genéricas em shares | Baixa autoridade | 5h |

---

## 4. Próximos Passos (Execução Técnica)
1.  **Auditoria Técnica GSC:** Analisar a queda real de impressões via ferramenta de diagnóstico.
2.  **Benchmark Competitivo:** Mapear os 3 principais concorrentes (nacionais e internacionais).
3.  **Refinamento de Margem:** Ajustar `margin-guardian.ts` para tolerância de ruído.

**Status:** Aguardando aprovação para iniciar a FASE 1 da v597.
