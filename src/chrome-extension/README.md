# AI ENGINEERING REVIEWER - Chrome Extension

Esta é uma extensão Chrome funcional desenvolvida para auditar e otimizar planos de engenharia gerados por IAs.

## Funcionalidades
- **Analisar Plano**: Detecção de falhas, race conditions e maquiagem de erro.
- **Melhorar Prompt**: Geração de prompts estruturados e técnicos.
- **Validar Implementação**: Comparação entre promessa e resultado real.
- **Configuração de API**: Suporte a OpenAI e Anthropic (BYOK).

## Como Instalar (Modo Desenvolvedor)
1. Abra `chrome://extensions/` no Chrome.
2. Ative o "Modo do desenvolvedor" (canto superior direito).
3. Clique em "Carregar sem compactação".
4. Selecione a pasta `src/chrome-extension/dist`.

## Arquitetura
- **Manifest V3**: Padrão moderno de extensões.
- **Engine Desacoplada**: Lógica de análise separada da UI.
- **Segurança**: Armazenamento local de chaves (storage.local).
