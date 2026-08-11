# Diagnóstico de Erro de Build (v618)

## 🔴 ERRO REAL
Falha no teste de integridade da memória do projeto (`src/__tests__/memory-index-integrity.test.ts`).
O build falhou porque existem arquivos de memória sem o respectivo link no índice `index.md` (arquivos órfãos).

## 📍 ARQUIVO/LINHA
- **Teste:** `src/__tests__/memory-index-integrity.test.ts` na linha 39.
- **Causa:** Descompasso entre `.lovable/memory/index.md` e a pasta `.lovable/memory/preferences/`.

## 🧬 CAUSA RAIZ
A última tentativa de correção do build ("O arquivo portao-de-risco.md estava órfão") tentou resolver o problema citando o arquivo no índice, mas o build subsequente (conforme log capturado) indica que a falha persiste ou uma nova inconsistência foi introduzida. A auditoria manual via `diff` revelará se o nome do link no `index.md` diverge do nome do arquivo físico (ex: `protocolo-de-risco` vs `portao-de-risco`).

## 🔎 EVIDÊNCIA
Log do `npm run build:dev`:
`Test Files 1 failed | 80 passed (81)`
`src/__tests__/memory-index-integrity.test.ts > nenhuma regra fica órfã (todo arquivo é citado no índice) > expect(orfaos).toEqual([]);`

## 📊 IMPACTO
**IMPEDIMENTO TOTAL.** O sistema possui uma trava de segurança que impede o build/deploy se a documentação de regras (memória) estiver inconsistente. Isso garante que nenhuma regra de negócio seja "esquecida" pelos agentes.

## 🟡 CLASSIFICAÇÃO DE RISCO
**MÉDIO.** A correção envolve apenas sincronização de texto em arquivos de documentação (.md). Não afeta lógica de execução, banco de dados ou fluxos financeiros. O risco reside na possibilidade de mascarar uma regra importante se o link for feito incorretamente.

## 🛠️ CORREÇÃO PROPOSTA
1. Identificar o arquivo exato que está órfão (provavelmente `protocolo-de-risco.md` ou `portao-de-risco.md`).
2. Atualizar o `index.md` para usar o caminho correto `mem://preferences/<nome-correto>`.
3. Validar rodando especificamente o teste de integridade antes de qualquer outra mudança.

---
*Aguardando aprovação para sincronizar o índice de memórias.*
