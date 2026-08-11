# Plano de Contenção v617 — Opção B (Proteção Mínima e Segura)

Este plano detalha a implementação da estratégia de contenção preventiva do caractere invisível `U+2063`, cuja origem permanece **NÃO IDENTIFICADA**. A implementação foca em sanitização localizada e atômica, preservando a estabilidade da v615 e evitando mecanismos globais agressivos.

## 1. Escopo de Implementação

### A) Criação de Utilitário de Sanitização
- **Local:** `src/lib/dom-sanitizer.ts`
- **Ação:** Criar uma função pura `sanitizeText(str: string)` que remove `\u2063`, `\u200B` e `\uFEFF` de forma segura, sem afetar caracteres alfanuméricos ou pontuação legítima.

### B) Sanitização no `SocialProofPopup.tsx`
- **Local:** `src/components/SocialProofPopup.tsx`
- **Ação:** Sanitizar os campos `item.person.name`, `item.city` e `item.product` antes de serem exibidos nos parágrafos.

### C) Sanitização no `JarvisDetectorMentiras.tsx`
- **Local:** `src/components/JarvisDetectorMentiras.tsx`
- **Ação:** Sanitizar a string injetada via `dangerouslySetInnerHTML` na lista de auditoria, garantindo que o detalhe do relatório não contenha o caractere.

## 2. Preservação e Segurança
- **Baseline v615:** Nenhuma alteração em lógica de despacho, pagamentos ou RLS.
- **Sanitizador Global:** O código em `__root.tsx` baseado em `requestIdleCallback` será mantido intacto como segunda camada de defesa.
- **Sem MutationObserver:** Não será implementado o observer síncrono.
- **Sem CSS global:** Não haverá alteração em `styles.css`.

## 3. Validação Final
- Execução de `npm run test` para garantir integridade.
- Execução de `npm run build` para validar o pacote de produção.
- Inspeção visual via console para confirmar a ausência do caractere nos pontos tratados.

---
*Nenhuma alteração foi realizada. Aguardando aprovação final para execução.*
