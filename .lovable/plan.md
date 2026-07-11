## Objetivo
Criar linha **"BR Real"** como upsell premium para Instagram e TikTok seguidores, mantendo o catálogo mundial atual intacto (zero risco de quebrar sistema).

## Escopo
- Não altera pacotes atuais (`p100`...`p100k`, `l*`, `v*`).
- Adiciona novos SKUs com prefixo `br-` (ex: `br-p500`, `br-p1k`, `br-p2k`).
- Quantidades menores + preço 2-3x (margem maior).
- Aparece como **order bump** no checkout do pacote mundial correspondente.

## Passos

**1. Descobrir service IDs BR no SMMhype**
- Buscar em `service_id_matrix` / `service_id_overrides` do banco IDs marcados como "brazil"/"br"/"real".
- Se não existir, deixar placeholder e usar `SUPPLIER_SERVICE_ID_BR_*` como secret manual.

**2. Extender `smmhype.server.ts`**
- Adicionar entradas em `SMMHYPE_SERVICE_IDS`:
  ```
  "br-p500": <id>, "br-p1k": <id>, "br-p2k": <id>, "br-p5k": <id>
  ```
- Estender `packageToNetworkType()` para reconhecer prefixo `br-` → `{network:"instagram|tiktok", type:"followers_br"}`.
- Ajustar `resolveServiceId()` para tratar `br-*`.
- Atualizar `validateDispatcherConfig()` incluindo os novos SKUs no self-check.

**3. Catálogo de preços**
- Adicionar 4 SKUs BR na tabela `pricing_catalog` (via migration):
  - `br-p500` (500 seg BR) — R$ ~29
  - `br-p1k` (1000 seg BR) — R$ ~49
  - `br-p2k` (2000 seg BR) — R$ ~89
  - `br-p5k` (5000 seg BR) — R$ ~189
- Preços validados pela `margin-guardian` antes de commit.

**4. UI — Order bump no checkout**
- No `OrderBumpDialog.tsx` do fluxo Instagram/TikTok seguidores, oferecer upgrade "🇧🇷 Trocar por seguidores 100% brasileiros reais (+R$X)".
- Copy foco: engajamento real, comentários em português, perfis ativos.
- Uma opção só por checkout (não poluir).

**5. Landing dedicada (SEO grátis)**
- Rota `/comprar-seguidores-brasileiros` já existe → apontar CTA para os novos SKUs `br-*` em vez do genérico.

**6. Validação**
- Rodar `validateDispatcherConfig()` no boot: se algum `br-*` ficar sem service_id, log de erro mas **não bloqueia** o resto do sistema.
- Feature flag `admin_settings.br_line_enabled` (default false) para ligar só quando os service IDs estiverem confirmados.

## Detalhes técnicos
- Nada é removido, só adicionado → risco = zero para o fluxo mundial.
- Dispatcher usa mesmo pipeline (`dispatchSmmhype`), só muda o `serviceId` resolvido.
- Normalização de URL (`normalizeInstagramUser`, `normalizeTiktokTarget`) reaproveitada.
- Order bump reutiliza componente existente, só nova opção.

## Fora de escopo
- Não trocar pacotes atuais para BR.
- Não mexer em curtidas/views (só seguidores IG + TikTok nesta primeira leva).
- Nada de refactor no `pricing-engine`.

## Pergunta antes de codar
Você tem os **service IDs BR do SMMhype** em mãos (do painel deles) ou preciso deixar como secret pra você preencher depois?
