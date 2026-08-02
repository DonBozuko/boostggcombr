---
name: Tolerância de falha, hierarquia de regras e ritmo de revisão
description: Meta ≤1% de falha por semana (zero só para cobrar-sem-entregar), ordem de desempate Margem > Vitrine > Receita, e relatório semanal de 15 min na sexta.
type: preference
---
Decidido em 02/08/2026, depois de auditoria de causa raiz.

## 1. Tolerância numérica
- Meta: **≤1% de pedidos com falha de entrega por semana**.
- Acima de 1% → alerta vermelho (dono age). Abaixo → amarelo (robô resolve).
- **Zero absoluto** vale para UMA categoria só: **cobrar sem entregar**
  (Pix aprovado sem rota viável). Isso nunca é tolerado — trava no
  `route-preflight` antes de gerar cobrança.
- Não perseguir zero nas demais categorias: fornecedor terceiro, câmbio e
  mudança de catálogo são ruído externo. Defesa é detectar ≤2h e substituir.

## 2. Hierarquia quando duas regras brigam
Ordem de desempate, sempre nesta sequência:

**Margem > Vitrine > Receita**

- Margem: nunca vender no prejuízo, mesmo que derrube pacote da vitrine.
- Vitrine: prateleira honesta vence vontade de exibir mais produto.
- Receita: só decide quando as duas acima empatam.

Quem escreve a decisão final continua sendo o módulo dono da área
(`margin-guardian`, `shelf-authority`, `price-authority`). Esta ordem é para
resolver conflito entre eles, não para criar quarta autoridade.

## 3. Ritmo de revisão
- **Relatório semanal, sexta, 15 minutos.** Conteúdo: taxa de falha da semana,
  pacotes que saíram/voltaram à vitrine, custo de fornecedor que mexeu >5%,
  alertas vermelhos abertos.
- Fora disso, só reativo por alerta vermelho.
