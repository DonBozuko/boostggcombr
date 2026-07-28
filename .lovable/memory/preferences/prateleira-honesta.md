---
name: Prateleira honesta (v335)
description: Vitrine só mostra o que o sistema prova que entrega — sem fallback estático, sem aba vazia, sem promessa de linha indisponível
type: preference
---
1. **Banco respondeu vazio ≠ banco não respondeu.** `useDynamicPlans` só usa
   fallback estático enquanto a resposta não chegou. Categoria 100% pausada
   renderiza VAZIO. Trava: `src/__tests__/honest-shelf-fallback.test.ts`.
2. **Aba sem pacote não existe.** Seletor de categoria só lista categorias com
   pacote vendável; se sobra uma, o seletor some (ex.: `/trafego` hoje só
   Mundial — `trafego:br` está sem fornecedor).
3. **Texto acompanha o catálogo.** Title, subtitle e FAQ não podem prometer
   linha que não está na vitrine (removido "BR e Global" de `/trafego`).
4. **Diagnóstico pelo fornecedor viável.** O veredito da Bancada (margem x
   saldo) vem do fornecedor mais barato COM ID válido. Fornecedor caro não
   pode rotular o pacote como "prejuízo".
5. **Recarga com demanda real.** Alerta urgente só para pacote vendido nos
   últimos 90 dias; pacote gigante sem venda vai para "sob encomenda".
6. **Pausa por persistência.** Falha não-estrutural em 3 ciclos (6h) tira da
   vitrine com motivo em português; volta sozinha pelo prefixo `BANCADA:`.

**Por quê:** o cliente via pacote de tráfego BR que não tinha fornecedor
nenhum — o fallback estático mascarava a pausa. Alarme verde no admin e
prateleira mentindo na loja.
