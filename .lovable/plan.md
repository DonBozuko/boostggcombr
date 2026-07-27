## Diagnóstico (verificado no código, não no chute)

Não é "sistema quebrado". É **duas matemáticas de preço vivas ao mesmo tempo**, e a segunda nunca foi desligada quando a Autoridade Única (v305/v306) nasceu.

```text
FONTE 1 (correta, servidor)      FONTE 2 (fantasma, cliente)
price-authority.ts               profit-markup.ts  ← v173
 margem real 4x líquido           tierMultiplier 5x/8x/12x
 rampa +40%/ciclo                 scaledFloor R$5→R$20
 escada monotônica                costPer1k CHUMBADO no .tsx
        ↓                                 ↓
   pricing_items.price_brl        applyProfitFormula(buildPlans(...))
        ↓                                 ↓
   useDynamicPlans (15s)   ←—— sobrescreve ——   render inicial
```

Achados concretos:
- `src/lib/profit-markup.ts` é uma segunda fórmula completa de preço, importada por **6 rotas de venda**: youtube, facebook, tiktok, telegram, kwai, trafego.
- Essas rotas geram os pacotes com **custo chumbado no arquivo** (`costPer1k: 25`, `10`, `5`, `1`), ignorando o custo real do fornecedor.
- O cliente vê o preço fantasma primeiro; `useDynamicPlans` só corrige depois do fetch. Se o fetch falhar, o fallback fantasma **fica na tela e é comprável**.
- É exatamente essa a origem do "conserta e volta": a Autoridade arruma o banco, a UI continua desenhando a matemática de 2024.

O teste `price-single-writer` não pega isso — ele vigia escrita em `price_brl`, não cálculo de preço em memória.

## Plano — Operação Faxina (v307)

Sem "chamar ajuda", sem refactor de risco. Aditivo, em 4 fases, com prova real no fim de cada uma.

### Fase 1 — Congelar o fantasma (banco → servidor)
Garantir que as 6 categorias órfãs existem no banco com preço da Autoridade. Auditoria: para cada `id` de pacote das 6 rotas, conferir se há linha em `pricing_items`. Faltando linha = a rota depende do fantasma para existir. Essas linhas são criadas antes de qualquer coisa ser removida da UI.

### Fase 2 — Fallback honesto (UI)
`applyProfitFormula` e `buildPlans` saem das 6 rotas. Enquanto o banco não responde, a vitrine mostra **skeleton de carregamento** (já existe em `PremiumPricingGrid`), não preço inventado. Regra: sem preço do banco, não existe botão de compra.

### Fase 3 — Trava estrutural permanente
Novo teste `src/__tests__/price-single-math.test.ts`, irmão do `price-single-writer`:
- nenhum arquivo fora de `price-authority*` e `margin-guardian.ts` pode conter fórmula de preço (multiplicador de margem, piso escalonado, buffer de cupom);
- nenhum `.tsx` de rota pode conter `costPer1k`;
- `profit-markup.ts` fica reduzido a `formatBRL` (formatação pura) ou é deletado.

Deploy quebra se alguém reintroduzir. É isso que impede o loop de voltar em três semanas — igual à v305, que segurou.

### Fase 4 — Varredura dos vizinhos
Auditar (sem mexer no que estiver correto) os outros pontos que citei na auditoria anterior: `pedidos.functions.ts`, `pricing-engine.server.ts`, `reseller-pricing.ts`, `card-pricing.ts`. Cada um deve **ler** `price_brl`, nunca recalcular. Card +7% e desconto de revenda são transformações *sobre* o preço oficial — isso é legítimo e fica.

## Prova real exigida antes de qualquer "sinal verde"

Não declaro pronto com teste verde. Só com:
1. As 6 rotas renderizando preço do banco em produção, com o fantasma fisicamente removido do bundle.
2. 0 inversões de escada no banco após 3 ciclos de sync (as 7 inversões atuais precisam zerar).
3. 1 pedido canário real entregue numa das 6 redes órfãs.

## Detalhes técnicos

- Arquivos tocados: 6 rotas `.tsx`, `src/lib/profit-markup.ts`, 1 teste novo, `src/__tests__/margin-guard.test.ts` (importa `applyProfitFormula`), possivelmente 1 migração para popular categorias faltantes.
- Risco de regressão: a vitrine dessas 6 redes fica dependente do banco. Mitigado pela Fase 1 (popular antes de remover) e pelo skeleton da Fase 2.
- Rollback: as fases são independentes; reverter a Fase 2 restaura o fallback estático sem tocar em banco.
- `OrderBumpDialog.tsx` só usa `formatBRL` — não é infrator.

## O que eu recomendo cortar do escopo

Nada de reescrever o motor de pricing agora. O motor está certo desde a v306. O problema é sujeira ao redor dele. Refatorar o que já funciona seria trocar um risco conhecido por um desconhecido — exatamente o padrão que gerou esta bagunça.
