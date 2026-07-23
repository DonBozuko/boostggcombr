---
name: Nunca responder de memória sobre operação
description: Antes de afirmar qualquer coisa sobre fornecedor, rota, rede social, saldo, pedido, cron, RLS ou config — consultar banco/código primeiro. Nada de memória.
type: preference
---
Regra absoluta em qualquer tópico operacional (fornecedores, rotas, redes sociais, saldos, pedidos, crons, RLS, secrets, config):

1. NUNCA responder de memória. Sempre consultar banco (supabase--read_query) ou código (rg/view) ANTES de afirmar.
2. Fornecedor ≠ Rede social. Fornecedores estão na tabela `fornecedores` (SMMhype, SMMPainel, Verified). Redes são rotas em `src/routes/*` (instagram, tiktok, youtube, kwai, facebook, telegram). Kwai é rede, não fornecedor.
3. Se não sei de cabeça, digo "vou checar" e checo — não chuto.

**Por que:** já causei confusão dizendo "SMMhype + Kwai" no failover (misturei fornecedor com rota). Diretor perdeu tempo achando que o sistema estava quebrado quando era só minha resposta errada.
