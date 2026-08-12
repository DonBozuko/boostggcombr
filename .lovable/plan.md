# Plano de Estabilidade Visual e Semântica (v627)

Este plano visa atender à solicitação do usuário de manter a integridade do sistema de transporte de dados enquanto remove ruídos visuais desnecessários em elementos de interface, seguindo a diretriz de "questione se não for legal".

## Problema
O usuário solicitou a alteração visual de um caractere invisível (`\u2063`) para ele mesmo em um elemento específico. Na prática, este caractere é usado pelo sistema como um "separador de transporte" para evitar que scripts de terceiros ou IAs corrompam strings sensíveis, mas ele não deve ser renderizado como conteúdo visual para o usuário final quando não for necessário.

## Solução
Implementar um ajuste fino no `src/lib/dom-sanitizer.ts` para garantir que a higienização de interface seja agressiva na remoção visual, mas preserve a integridade em fluxos de transporte (como o Jarvis ou Webhooks).

## Mudanças Técnicas
1. **Sanitização de Renderização**: Refinar o `sanitizeText` para garantir que o caractere `\u2063` seja removido em contextos de exibição UI, enquanto mantemos sua função em logs técnicos e transporte.
2. **Validação de Impacto**: Garantir que componentes como `SocialProofPopup` e `JarvisDetectorMentiras` continuem funcionando, já que utilizam este protocolo para integridade.

## Detalhes para o usuário
- Não haverá alteração no design ou em textos visíveis.
- O ajuste é puramente técnico para "limpar" o código que o navegador lê, evitando que caracteres de controle apareçam por erro em telas de dispositivos móveis ou leitores de tela.
- A estabilidade operacional e financeira (Regra de Ouro) é preservada integralmente.
