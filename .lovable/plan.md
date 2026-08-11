# Plano de Consolidação de Backend (Supabase/Lovable Cloud)

Este plano visa esclarecer a relação entre Lovable Cloud e Supabase e garantir que o projeto utilize a infraestrutura de backend de forma consistente, conforme solicitado.

## O que são Cloud e Supabase neste projeto?
No contexto deste projeto, **são a mesma coisa**.
- **Supabase** é a tecnologia de banco de dados, autenticação e storage.
- **Lovable Cloud** é o serviço que gerencia e hospeda esse Supabase para você de forma automática.
Quando você vê "Cloud" ou "Backend" no painel, estamos nos referindo ao Supabase que sustenta o sistema. Tudo já está centralizado no Supabase.

## Detalhes Técnicos
- **Banco de Dados**: PostgreSQL hospedado no Supabase.
- **Autenticação**: Supabase Auth (gerencia logins de admin e usuários).
- **Funções de Servidor**: TanStack Start `createServerFn` (executadas em ambiente seguro que se comunica com o Supabase).
- **Segurança**: RLS (Row Level Security) e a nova camada `assertAdmin` (v607) protegem os dados diretamente no banco.

## Ações de Auditoria e Reforço
1. **Verificação de Persistência**: Confirmar se todas as tabelas críticas (`pedidos`, `ledger`, `app_config`, `memorias_sistema`) possuem RLS e GRANTs corretos.
2. **Remoção de Resíduos**: Verificar se não há mock data ou persistência local (localStorage) sendo usada para decisões de negócio que deveriam ser do banco.
3. **Consolidação de Configurações**: Garantir que o `app_config` no Supabase seja a única fonte de verdade para tokens e chaves (como o token do Mercado Pago).

Nenhuma alteração de código é necessária para "mudar" para o Supabase, pois o projeto já nasceu e opera 100% sobre ele. Vou apenas realizar uma varredura para garantir que nada esteja "fora" dessa infraestrutura.

---
**Diretoria:** Posso prosseguir com a varredura final de integridade para garantir que não haja nenhum "puxadinho" de dados fora do Supabase?