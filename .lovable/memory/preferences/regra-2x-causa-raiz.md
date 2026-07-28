---
name: Regra 2x — problema repetido vira causa raiz
description: Se o mesmo tipo de problema aparecer 2x, é proibido aplicar patch; obrigatório mapear a rota inteira e matar a causa
type: preference
---

# Regra 2x

Se um problema do mesmo **tipo** acontecer pela segunda vez, patch está proibido.

## O que é "mesmo tipo"
Não é o mesmo pacote nem o mesmo ID. É a mesma família de falha. Exemplos reais:
- pacote entregou errado / não entregou → família "vínculo com fornecedor"
- preço subiu/desceu sozinho → família "autoridade de preço"
- pacote sumiu da vitrine → família "pausa automática"
- reembolso automático inesperado → família "roteamento"

## O que fazer na 2ª ocorrência
1. Parar de corrigir o caso individual.
2. Mapear a rota do dinheiro inteira dessa família (banco → serviço → rota → UI).
3. Perguntar: **"o que o fornecedor/usuário pode mudar sem o sistema perceber?"** — não "o que quebrou hoje?".
4. Criar trava que age **antes da cobrança**, não depois do alerta.
5. Teste de regressão que falha se a trava for removida.

## Por que existe
Histórico v290 → v310: dez versões atacando sintoma da mesma família (vínculo sujo com fornecedor).
A causa real (ID igual + produto trocado por trás) só foi atacada na v312–v314.
Modo bombeiro custa mais caro que modo orquestrador.

## Frase de corte
"Isso já aconteceu antes?" — se sim, não mexe no arquivo. Mapeia primeiro.
