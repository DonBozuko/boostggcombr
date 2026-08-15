# Plano de Restauração e Estabilização Final (v641)

O sistema foi auditado e encontra-se em **Modo Estabilização Operacional**. Este plano foca na correção de inconsistências críticas identificadas na telemetria e na blindagem definitiva do checkout contra regressões de schema.

## Diagnóstico Técnico (Causa Raiz)

1.  **Checkout em Crise Silenciosa**: Alertas do Jarvis revelaram falhas `DATABASE_ERROR` no checkout devido ao uso de colunas inexistentes no código (`bump_aplicado`, `cupom_aplicado`, `bump_ofertado`) que divergem da estrutura real do banco (`bump_accepted`, `affiliate_code`, `bump_offered`).
2.  **Mentira na Vitrine (Pausas)**: Os vetos ativos em 7 pacotes `br-p*` são resíduos de "Bancada: Nenhum fornecedor habilitado", indicando que o roteamento BR não está encontrando fornecedores com Refill + Nome BR ativos.
3.  **Integridade do Jarvis**: O semáforo apresenta "Falso Verde" ou telemetria inconsistente quando o banco falha parcialmente, corrigido agora com a integração de `jarvis_incidents` e máquina de estados rigorosa.

## Ações Imediatas (Execução v641)

### 1. Blindagem do Checkout (Fim do DATABASE_ERROR)
Corrigir o mapeamento de colunas em `src/lib/pedidos.functions.ts` para alinhar com o schema real do banco e evitar falhas de inserção de pedidos.
- `bump_aplicado` -> `bump_accepted`
- `bump_ofertado` -> `bump_offered`
- `cupom_aplicado` -> `affiliate_code` (ou `cupom` dependendo do uso pretendido)

### 2. Saneamento de Alertas e Semáforo
Executar limpeza de alertas "fantasmas" que não representam a realidade operacional e garantir que o semáforo único do Jarvis reflita incidentes abertos na tabela `jarvis_incidents`.

### 3. Estabilização de Preços e Margem
Manter a regra de **Margin Guardian** ativada: o preço no site nunca cai abaixo do custo real de quem entrega a quantidade (Verified/SMMPanel), ignorando custos teóricos do SMMHype para pacotes grandes.

## Verificação de Sucesso
- **Checkout**: Nenhum erro de coluna inexistente nos logs após a correção.
- **Jarvis**: Incidentes abertos bloqueiam o checkout via Circuit Breaker.
- **Transparência**: O texto da rota principal (`/`) deve refletir o estado de restauração completa conforme solicitado.

**Aviso:** Nenhuma funcionalidade nova será adicionada. O foco é 100% em restaurar o que já existia e garantir que funcione sem mentiras.
