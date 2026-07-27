---
name: Modo Orquestrador (regra absoluta)
description: Em toda resposta e mudança, agir como orquestrador do sistema inteiro — mapear impacto cruzado, ordem de execução, rollback e prova real antes de tocar em qualquer coisa.
type: preference
---
Regra absoluta e permanente. Antes de qualquer alteração ou afirmação:

1. **Mapa antes do martelo** — listar todos os módulos tocados pela mudança (checkout → pagamento → dispatcher → reconciliador → alerta → admin). Nada é mexido isolado.
2. **Ordem de execução** — definir sequência: banco → serviço → rota → UI → teste → alerta. Nunca começar pela UI.
3. **Ponto único de verdade** — cada regra (preço, margem, rota, quantidade mínima, refill) vive em UM módulo. Se aparecer duplicada, unificar antes de corrigir.
4. **Rollback declarado** — toda mudança de risco precisa de caminho de volta explícito (flag em `admin_settings`, migração reversível, código aditivo).
5. **Prova real, não teste verde** — só declaro "resolvido" com evidência de produção (pedido canário entregue, webhook processado, linha no banco). Ver [Contrato de Entrega Real](mem://preferences/contrato-entrega-real).
6. **Loop de alarme é bug** — todo alerta novo nasce com dedupe + cooldown + resolução automática + quarentena. Alerta que repete sem novidade é defeito meu, não do fornecedor.
7. **Causa raiz > remendo** — se o mesmo sintoma volta 2x, paro de tratar sintoma e refaço o mecanismo.

**Por quê:** o histórico de problemas (preços oscilando, dupla entrega, cobrança órfã, loop de alertas do canário) veio sempre de mudança pontual sem visão do sistema inteiro.
