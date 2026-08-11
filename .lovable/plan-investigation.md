# Relatório Investigativo: Origem do Caractere U+2063 (Antidote Pro)

Esta investigação técnica exaustiva teve como objetivo rastrear a origem do caractere invisível `U+2063` (Invisible Separator) no projeto BOOSTGG.

## 1. FATO COMPROVADO
- **Inexistência no Fonte:** Não existem bytes literais `U+2063` (ou as sequências `\u2063`, `&#8291;`) nos arquivos de código do projeto (`src/`), com exceção do próprio sanitizador em `src/routes/__root.tsx`.
- **Inexistência em Dados Estáticos:** As listas de nomes, cidades e produtos em `SocialProofPopup.tsx` e outros componentes são strings limpas.
- **Sanitização Presente:** Já existe uma "Blindagem Total (v606)" em `__root.tsx`, mas ela opera via `requestIdleCallback`, o que introduz uma latência de processamento.
- **Vetor de Scripts:** O projeto carrega scripts externos de alta volumetria e manipulação de DOM: Google Tag Manager (GTM), Google Analytics (GA4) e TikTok Pixel.

## 2. HIPÓTESE
- **Injeção de Terceiros (Vetor E):** Scripts como o do TikTok ou GA4 frequentemente utilizam caracteres invisíveis para marcar posições no DOM, rastrear visualização de elementos ou evitar que spans vazios sejam colapsados por motores de renderização antigos.
- **Latência do Sanitizador (Causa da Visibilidade):** O uso de `requestIdleCallback` faz com que o sanitizador só rode quando o navegador está ocioso. Se um script externo injetar o caractere durante o carregamento inicial ou durante uma animação, ele permanecerá no DOM até que o navegador encontre um slot de tempo livre, tornando-o detectável por ferramentas de auditoria e bots.

## 3. CAUSA RAIZ CONFIRMADA
**CAUSA RAIZ AINDA NÃO CONFIRMADA**

### Por que não foi confirmada?
Embora o Vetor E (Scripts Externos) seja o suspeito mais provável (visto que o código do projeto está limpo), não é possível disparar o evento de injeção em um ambiente de servidor sem uma sessão de navegador real com os pixels disparando (TikTok Pixel requer interação real para carregar seus módulos de tracking).

### Próximo Teste Necessário para Confirmação:
1. **Isolamento de Scripts:** Desativar temporariamente o TikTok Pixel e o GTM em um ambiente de teste/preview e verificar se o caractere `U+2063` para de aparecer.
2. **Snapshot de Hidratação:** Capturar o HTML bruto gerado pelo SSR (via `curl`) e comparar com o HTML final após 10 segundos de hidratação. Se o caractere não estiver no `curl` mas estiver no DOM final, a origem é 100% Client-Side (Script Externo ou Extensão).

---

## Por que a correção proposta no v617 é o melhor caminho?
Independentemente de **quem** injeta (TikTok, Google ou uma extensão de navegador do cliente), o projeto BOOSTGG não tem controle sobre o código desses terceiros.

A correção do v617 é a melhor estratégia porque:
1. **Sanitização Síncrona:** Troca o `idle` por um `MutationObserver` síncrono, eliminando a janela de visibilidade do caractere.
2. **Defesa em Profundidade (CSS):** Esconde o elemento mesmo que o JS falhe por um milissegundo.
3. **Imunidade de Dados:** Garante que, se o caractere vier de uma API futura, ele será expurgado antes de tocar a tela.

**Status:** Aguardando autorização para o "Plano v617 — Blindagem Antidote Pro".
