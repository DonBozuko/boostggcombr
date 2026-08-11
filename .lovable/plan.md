---
name: Auditoria Real do Sistema v614
description: Relatório técnico profundo da estrutura atual frontend, backend e banco de dados sem alterações.
type: reference
---

# MAPA REAL DO SISTEMA ATUAL — BOOSTGG (v614)

Este relatório reflete o estado técnico exato do projeto em 11 de Agosto de 2026, obtido via inspeção forense de arquivos, esquemas de banco de dados e runtime.

## 1. Estrutura de Software
- **Frontend:** TanStack Start v1 (React 19 + Vite 7). Arquitetura baseada em rotas (`src/routes`) com SSR/SSG.
- **Backend:** TanStack Server Functions (`src/lib/*.functions.ts`) rodando em Edge Runtime. Não utiliza Supabase Edge Functions externas, mas sim RPCs internas.
- **Banco de Dados:** PostgreSQL (Supabase/Lovable Cloud) com RLS (Row Level Security) ativo em tabelas críticas.
- **Autenticação:** Supabase Auth (JWT via Bearer Token) integrado via middleware do TanStack (`requireSupabaseAuth`).

## 2. Mapa de Dados (Supabase)
Tabelas identificadas e ativas:
- **`pedidos`**: Coração da operação (ID MP, Status, Valor, Fornecedor).
- **`pricing_items`**: Autoridade de Vitrine (Preços, IDs de serviço, Categoria).
- **`financial_ledger` / `admin_treasury`**: Fonte de verdade financeira (Lucro, Custo, Taxas).
- **`jarvis_alerts`**: Log de integridade e alarmes do sistema.
- **`admin_audit_logs`**: Rastro de ações administrativas e disparos de cron.
- **`afiliados` / `afiliado_comissoes`**: Sistema de parceiros e saldo.
- **`app_config`**: Persistência de tokens (ex: Mercado Pago) e flags globais.
- **`user_roles`**: Controle de permissões (Admin/User).

## 3. Matriz de Funcionalidades

| FUNCIONALIDADE | FRONTEND | BACKEND | BANCO | STATUS |
| :--- | :--- | :--- | :--- | :--- |
| **Checkout (Pix/MP)** | Real | Real | Real | Funcionando |
| **Despacho Automático** | Parcial (Logs) | Real | Real | Funcionando (v613) |
| **Painel Jarvis (NOC)** | Real | Real | Real | Funcionando |
| **Autoridade de Preço** | Real | Real | Real | Funcionando (Drift 1.2%) |
| **Auto-Cura (Reparo)** | Real | Real | Real | Funcionando (v613) |
| **Sistema de Afiliados** | Real | Real | Real | Funcionando |
| **Webhooks (MP)** | inexistente | Real | Real | Funcionando (v613) |
| **SEO Dinâmico** | Real | Real | Parcial | Funcionando |
| **Contador Inscritos** | Real | Real | Parcial | Funcionando |

## 4. Auditoria de Saúde Técnico-Operacional
- **Erros Atuais:** Nenhum erro de sintaxe ou build detectado. O sistema está estável.
- **Funções Incompletas:** Algumas rotas de "Revenda" possuem UI avançada mas dependem de saldo manual (Nível 3 de autonomia).
- **Dados:** Operação 100% real. Mock apenas em modos de `sandbox` explicitamente ativados por flag no `admin_settings`.
- **APIs Configuradas:** Mercado Pago (Pagamentos), SMMHype, SMMPanel, VerifiedSMM (Fornecedores), Telegram (Alertas), TikTok/Google (Pixels/Ads).

## 5. Riscos e Observações
- **Drift de Margem:** Controlado por `MARGIN_EPSILON = 0.988` (1.2% de folga).
- **Latência de Cron:** O sistema ignora falhas de smoke test se o reconciliador estiver vivo (Prevenção de Falso Positivo v613).
- **Persistência:** O token do Mercado Pago é persistido em `app_config`, eliminando dependência de env vars dinâmicas para renovação.

---
**NÃO FORAM ENCONTRADAS FALHAS CRÍTICAS DURANTE ESTA INSPEÇÃO.**
**ESTADO: READY FOR OPERATION.**
