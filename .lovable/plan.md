# Plano de Implementação — Auditoria Forense e Sanitização DOM v600

O objetivo deste plano é consolidar a sanitização do caractere invisível `U+2063` (Invisible Separator) e documentar o diagnóstico técnico para futuras buscas por similaridade, garantindo a integridade visual e técnica do sistema BOOSTGG.

## 1. Diagnóstico Técnico (Arquivista de Memória Crítica)

### ASSINATURA DO SINTOMA
`anomalia-visual`, `U+2063`, `invisible-separator`, `pixel-injection-artifact`, `phantom-span`.

### RAIO-X ESTRUTURAL
O caractere `U+2063` (Invisible Separator) foi identificado no topo do DOM (seletor `:1`). Auditoria binária exaustiva confirmou que o caractere não reside em arquivos estáticos (`src/`, `public/`), indicando injeção dinâmica via scripts de rastreamento de terceiros (Google/TikTok Analytics) ou ambiente de runtime. A presença desse span vazio gera ruído em auditorias automatizadas de acessibilidade e SEO.

### AÇÃO DE AUTO-CURA
1. **DOM Sanitizer (Runtime):** Implementação de um `MutationObserver` no `RootComponent` (`src/routes/__root.tsx`) que intercepta a injeção do caractere e remove o elemento `<span>` de forma atômica pós-hidratação.
2. **Blindagem CSS:** Adição de regra `span:empty { display: none !important; }` em `src/styles.css` para neutralizar artefatos visuais antes da execução do script de limpeza.

### ALERTA PARA O FUTURO
Monitorar a injeção de scripts no `head`. Se o sintoma persistir em elementos não-span (como `div` ou `p`), o sanitizer deve ser expandido para varredura recursiva de texto via `NodeIterator`.

## 2. Etapas de Execução

### Fase 1: Sanitização de Código (Concluída)
- [x] Atualizar `src/routes/__root.tsx` com `useEffect` e `MutationObserver`.
- [x] Atualizar `src/styles.css` com regra de supressão para elementos vazios.

### Fase 2: Validação
- [ ] Verificar ausência do caractere via `console.log` no ambiente de preview.
- [ ] Validar que scripts legítimos (GTM, TikTok) continuam operando sem quebra de funcionalidade.

## 3. Detalhes Técnicos para Engenharia
- **Namespace:** `v600-dom-sanitizer`
- **Impacto:** Baixo (apenas limpeza de resíduos visuais).
- **Mecanismo:** `document.querySelectorAll("span").forEach(s => s.textContent === "\u2063" && s.remove())`.
- **Persistência:** O observer garante que mesmo spans injetados tardiamente por SPAs de terceiros sejam removidos.
