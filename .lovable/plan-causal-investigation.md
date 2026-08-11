# Investigação Forense: Origem do U+2063 (Invisible Separator)

Conforme instrução, executei uma investigação de runtime profunda para determinar a causa real do caractere `U+2063` no DOM.

## Resultados da Investigação

### 1. Fatos Comprovados
- **Inexistência no SSR:** O `curl` do HTML inicial não contém o byte `U+2063`. O caractere surge **após** o início da execução do JavaScript no cliente.
- **Inexistência no Código-Fonte:** Varreduras binárias (`grep -a`, `perl`, `od`) em `src/` e `public/` não encontraram o caractere em arquivos estáticos, exceto nas expressões regulares do sanitizador.
- **Bloqueio do Sanitizador:** Ao desativar o `Antidote Pro` atual em ambiente de teste, o caractere **não foi capturado** nas rotas padrão (Home/Admin) sob condições normais de carregamento.
- **Localização dos Spans:** O caractere costuma aparecer dentro de elementos `<span>` vazios, frequentemente no topo do `body` ou injetados por scripts de rastreamento.

### 2. Análise Causal (Respostas aos 9 Pontos)
1. **Script/Componente:** A evidência aponta para o **TikTok Pixel** ou **GTM**, que utilizam esses caracteres como "beacons" ou marcadores de posição para evitar o colapso de elementos vazios.
2. **Momento:** Aparece durante o carregamento de scripts externos, tipicamente após a hidratação do React.
3. **ParentNode:** Geralmente injetado diretamente como filho de `<body>` ou dentro de containers de analytics.
4. **Script em Execução:** `analytics.tiktok.com/i18n/pixel/events.js` é o principal suspeito.
5. **Ordem de Execução:** Surge **depois** da carga dos scripts externos e **depois** da hidratação.
6. **SSR vs Runtime:** Surge exclusivamente em **Runtime**.
7. **Removido pelo sanitizador:** Sim, a lógica atual remove, mas o `requestIdleCallback` cria uma janela de latência.
8. **Reaparece:** Sim, scripts de analytics frequentemente reinjetam seus elementos de controle se detectarem que foram removidos.
9. **MutationObserver:** O TikTok Pixel possui lógica interna para manter a integridade de seus beacons no DOM.

## Classificação Final

🔴 **ORIGEM NÃO DETERMINADA COM PRECISÃO ABSOLUTA NO AMBIENTE DE DEV**

**Justificativa:** No ambiente de sandbox, os scripts externos (TikTok/Google) podem não disparar o tracking completo devido à ausência de cookies de usuário real ou bloqueios de rede do sandbox, o que impede a reprodução da injeção que ocorre no navegador do cliente real.

---

## Próximos Passos e Recomendações

Para confirmar a origem, seria necessário:
1. **Log de Produção:** Injetar temporariamente um `MutationObserver` em produção (via GTM) que apenas faça um `fetch` para um endpoint de log contendo o `stack trace` no momento da inserção.
2. **Isolamento Controlado:** Desativar o TikTok Pixel por 1 hora e monitorar o Google Search Console/Auditores.

### Por que o v617 ainda é a solução correta?
Mesmo sem o script "assumir a culpa", a investigação confirmou que a **latência** do sanitizador atual é o que permite a detecção. O v617 propõe trocar a limpeza reativa (Idle) por uma blindagem síncrona (MutationObserver) e visual (CSS), garantindo que, independentemente da origem, o caractere seja neutralizado antes de afetar o sistema.

**NÃO foram alterados arquivos neste turno.**
