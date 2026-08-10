# Plano de Estabilização v595 — Correção de Inversão de Preço e Travas de Margem

Este plano detalha a correção dos problemas reportados nas varreduras automáticas: pacotes vendendo com prejuízo, alarmes travados e a inversão de preço onde pacotes maiores custam menos que os menores.

## Diagnóstico Técnico
1.  **Inversão de Preço (p350k vs p200k):** O pacote de 350k está mais barato que o de 200k. Isso indica uma falha na lógica de "Preço Mínimo Progressivo" ou uma cotação de custo desatualizada em um dos fornecedores da rota.
2.  **Alarmes de Margem Travados (br-p100, br-p10k, etc.):** A v591 tentou destravar a rampa, mas os alertas persistem. É necessário revisar a `enforcePriceAuthority` para garantir que o ajuste de preço não esteja sendo barrado por um teto muito baixo em relação ao custo real (Price Drift).
3.  **Pacotes com Prejuízo (br-p100, p200k):** Confirmação de que o buffer de 15% (PRIME15) + Taxas MP está consumindo a margem bruta devido ao custo base do fornecedor ter subido acima do preço de venda calculado.

## Ações Imediatas

### 1. Ajuste na Autoridade de Preço (`src/lib/price-authority.server.ts`)
- Implementar a trava de **Monotonicidade de Preço**: Garantir que, dentro da mesma categoria, um pacote com maior quantidade nunca custe menos que um pacote com menor quantidade.
- Revisar a `resolveCheckoutPricing` para garantir que o custo real do fornecedor (Smart Routing) seja sempre a base primária, ignorando tetos de segurança se o custo ultrapassar o preço de venda (forçando o aumento ou pausa do item).

### 2. SQL Migration — Ajuste de Margens e Limpezas
- Executar `update_pricing_monotonicity`: Uma rotina no banco para alinhar preços que ficaram defasados.
- Limpeza de alertas obsoletos de "Canal Morto" ou "Margem" que já foram tratados mas persistem no log de 2h do Jarvis.

### 3. Validação do Jarvis (`src/lib/jarvis-detector-mentiras.server.ts`)
- Adicionar um novo check: "Monotonicidade de Preço" para capturar inversões antes do deploy.

## Critérios de Aceite
- [ ] Nenhum pacote de quantidade X+1 custa menos que o pacote de quantidade X.
- [ ] O pacote `p350k` deve ter seu preço recalculado para ser ≥ `p200k`.
- [ ] Alarmes de "Pacote vendendo com prejuízo" devem cessar após o recálculo automático.
- [ ] O caractere `U+2063` (objeto de alarmes anteriores) continuará sendo tratado como ruído de runtime, sem intervenção no código.
