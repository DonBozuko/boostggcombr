# Plano de Migração: BOOSTGG para Nova Conta Lovable

Este plano detalha o processo para migrar o projeto **BOOSTGG** para uma nova conta Lovable de forma segura, garantindo a integridade do banco de dados e das integrações.

## 1. Preparação (Conta Atual)
- [ ] Confirmar que todas as alterações recentes estão commitadas e enviadas para o repositório GitHub vinculado.
- [ ] Identificar e listar todos os segredos em **Settings > Secrets** (Mercado Pago, Telegram, etc.). *Eles não migram automaticamente.*

## 2. Configuração na Nova Conta (Celular/Desktop)
- [ ] **Importar do GitHub:** Na nova conta, selecione "Import from GitHub" e escolha o repositório do projeto.
- [ ] **Habilitar Lovable Cloud:** Após a importação, vá para o menu **Connectors** e habilite o **Lovable Cloud**. 
    - *Nota: O sistema aplicará automaticamente as migrações existentes em `supabase/migrations/`, reconstruindo a estrutura do banco.*
- [ ] **Configurar Segredos:** Vá em **Settings > Secrets** na nova conta e adicione todas as chaves anotadas no passo 1.

## 3. Validação e Ajustes
- [ ] **Auth e RLS:** O Lovable Cloud gerencia o Supabase Auth. Verifique se o login/cadastro funciona.
- [ ] **Domínio:** Se o projeto original tiver um domínio customizado, ele precisará ser desconectado do projeto antigo e configurado no novo (ou use o subdomínio `.lovable.app` gerado).
- [ ] **Logs Jarvis:** O histórico de incidentes/logs da conta antiga **não será migrado** (pois está no banco de dados específico do projeto anterior), a menos que seja feita uma exportação/importação manual de dados via SQL.

## Riscos e Mitigação
- **Dados Dinâmicos:** Pedidos e transações reais ficam no banco da conta antiga. A migração de código cria o "esqueleto" (tabelas). Para migrar os *dados* dos clientes, é necessário exportar os dados da tabela via SQL e importar na nova.
- **Idempotência:** Como a nova conta terá um novo banco, IDs de transação antigos não serão conhecidos pelo novo banco. Recomenda-se fazer a virada em um momento de baixo tráfego.

## Próximos Passos
1. O usuário confirma a visualização deste plano.
2. O usuário inicia a importação na conta nova.
3. Eu guio a configuração dos segredos e validação da infraestrutura.
