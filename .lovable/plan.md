# Plano de Implantação: Dashboard Jarvis NOC (v630)

Implementação de um dashboard de monitoramento operacional "Build-First" focado em saúde de checkout, infraestrutura e registro de incidentes com base no protocolo de causa raiz (v629).

## Mudanças do Usuário

- Criação de uma interface de monitoramento em tempo real.
- Sistema de semáforo global (Verde, Amarelo, Vermelho) baseado em métricas rígidas.
- Formulário de registro de incidentes com validação de causa raiz e regressão.
- Design dark mode focado em alta visibilidade operacional.

## Detalhes Técnicos

- **Status Global (v630):**
  - **Verde:** Requer Sucesso Checkout > 95%, Latência < 200ms e Erros HTTP < 1%.
  - **Amarelo:** Dados ausentes, métricas abaixo do ideal ou alertas ativos.
  - **Vermelho:** Falha crítica detectada ou queda total de métrica.
- **Componentes:**
  - `JarvisNocDashboard.tsx`: Componente principal de visualização.
  - `IncidentRegistryForm.tsx`: Formulário com validação Zod para conformidade v629.
  - Integração com `jarvisNocSnapshot` para dados em tempo real.
- **Rota:** Disponível em `/admin` sob a aba "NOC" ou via acesso direto se autenticado.

## Próximos Passos

1. Criar os componentes de UI para os cards de serviço e sparklines.
2. Implementar a lógica de cálculo de status global baseada em janelas de tempo.
3. Integrar o formulário de incidentes com a tabela `admin_audit_logs` ou uma nova tabela de incidentes.
4. Atualizar a rota `/admin` para exibir este novo painel como prioridade de visualização NOC.
