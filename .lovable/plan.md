# Plano: Otimização do Fluxo de Trabalho Assíncrono (v625)

Este plano visa consolidar as diretrizes de desenvolvimento contínuo, garantindo que operações de suporte (memória, auditoria, âncoras e integridade) operem de forma 100% transparente e sem interrupções no fluxo principal.

## Ações Técnicas

1.  **Refinamento do Protocolo de Risco:**
    *   Atualizar `.lovable/memory/preferences/protocolo-de-risco.md` para incluir a diretriz de **Silêncio Operacional Absoluto** para tarefas de infraestrutura de memória.
    *   Estabelecer que a "limpeza" e sincronia de arquivos de sistema deve ocorrer em paralelo a entregas funcionais, sem ser citada como progresso ou tarefa no chat.

2.  **Consolidação de Integridade Transparente:**
    *   Reforçar no `index.md` que a integridade de dados (Ledger, RLS, Auditoria) é uma camada de proteção passiva.
    *   Ajustar o comportamento do Agente para omitir logs de operações de sistema, focando 100% na resposta funcional ao usuário.

3.  **Manutenção Silenciosa de Âncoras:**
    *   Integrar a lógica de preservação de âncoras (Antidote Pro) no fluxo de build padrão, tratando-a como um requisito técnico implícito e não uma funcionalidade a ser reportada.

## Detalhes Técnicos
*   **Versionamento:** Elevação para v625.
*   **Modo Operacional:** Build-First Assíncrono.
*   **Interface:** Remoção de logs técnicos de auditoria das respostas ao usuário.

## Impacto
*   **Velocidade:** Aumento do ritmo de entrega ao eliminar o tempo de relato de tarefas auxiliares.
*   **Experiência:** Foco total na construção do produto, com a IA agindo como um engenheiro executor direto.
