# Plano de Investigação Forense: Isolamento Causal do U+2063

O objetivo é identificar qual script externo é o responsável pela injeção do caractere invisível `U+2063` (Invisible Separator) através de testes de isolamento controlado.

## Scripts Alvos
1. **TikTok Pixel** (ID: `D97FQ2RC77U5KEVKK73G`)
2. **Google Tag Manager** (ID: `GTM-MSX3W7PZ`)
3. **Google Analytics / GA4** (ID: `G-9RBZGZTTMC`)
4. **JivoChat** (Script injetado via `window.jivo_id`)

## Metodologia de Teste (Sandbox)
Para cada script, utilizaremos um script de automação (Playwright) que:
- Carrega a página com **interceptação de rede** para bloquear/permitir scripts específicos.
- Monitora o DOM em tempo real usando `MutationObserver` injetado via `evaluateHandle`.
- Captura o exato momento em que um nó contendo `\u2063` é inserido.
- Registra o `stack trace` do script que realizou a operação `appendChild` ou `innerHTML`.

## Etapas da Investigação
1. **Baseline:** Carregar o site bloqueando TODOS os scripts externos. Verificar se o caractere aparece (deve ser negativo).
2. **Isolamento TikTok:** Carregar APENAS o script do TikTok. Observar o DOM.
3. **Isolamento GTM:** Carregar APENAS o Google Tag Manager. Observar o DOM.
4. **Isolamento GA4:** Carregar APENAS o Google Analytics. Observar o DOM.
5. **Isolamento JivoChat:** Carregar APENAS o script do Jivo. Observar o DOM.
6. **Cruzamento:** Se nenhum isolado disparar, testar combinações (ex: GTM + TikTok).

## Relatório Final de Causalidade
O resultado será apresentado no formato solicitado:
- **Conclusão:** 🟢 CONFIRMADA, 🟡 PROVÁVEL ou 🔴 NÃO IDENTIFICADA.
- **Análise Técnica:** Por que o script insere o caractere e se ele é crítico para o tracking.
- **Impacto da Remoção:** Se a remoção quebra a funcionalidade do script.
- **Recomendação de Correção:** Solução técnica definitiva baseada na causa.

---

**IMPORTANTE:** Nenhuma alteração será feita nos arquivos `src/` ou `public/` durante este processo. Tudo ocorrerá em scripts temporários na pasta `/tmp/browser/`.
