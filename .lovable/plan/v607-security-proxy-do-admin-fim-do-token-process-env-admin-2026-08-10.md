# v607 — Security Proxy do Admin (fim do `token === process.env.ADMIN_TOKEN`)

## O que a auditoria desta rodada encontrou (verificado, não achismo)

Varri todos os `createServerFn` e rotas `api/public` que importam o cliente administrativo (bypass de RLS). Números reais:

- 57 comparações inline de `process.env.ADMIN_TOKEN` espalhadas por 40+ arquivos, convivendo com 55 chamadas ao helper `isAdminToken`. Ou seja: o "ponto único de verdade" da v399 nunca foi concluído — metade do sistema ainda compara a chave mestra na mão dentro do handler.
- A comparação é `token === expected` (string simples). Sem comparação em tempo constante, sem contador de falhas, sem lockout, sem log de tentativa negada. Uma função privilegiada que devolve `UNAUTHORIZED` hoje é indistinguível de uma que nunca foi atacada — não existe telemetria de falha de auth.
- A superfície protegida por essa chave única inclui mutação de preço (`upsertPricingCatalog`, `deletePricingCatalog`, `approvePriceQuarantine`), tesouraria (`treasurySnapshot`, `pricingLedgerSnapshot`), carteiras (`walletsSnapshot`) e simulação de compra. Um único segredo estático, sem expiração no servidor, governa tudo isso.
- O token vive no navegador (`sessionStorage`, TTL 30 min). O TTL é puramente client-side: o servidor aceita o mesmo token para sempre. Limpar a aba não revoga nada.
- Endpoints de revenda/afiliado já têm rate limit por IP (`portalLimited`, `checkRateLimit`) — o admin, que é a superfície mais valiosa, não tem nenhum.

Diagnóstico estrutural: não é bug de arquivo, é ausência de camada. Não existe um *guard* entre "requisição" e "cliente administrativo". Cada handler improvisa o próprio porteiro.

## O que será construído

### 1. `src/lib/admin-guard.server.ts` — porteiro único

Função `assertAdmin(token)` que retorna `{ ok }` ou motivo, executando nesta ordem:

```text
1. lockout  -> se IP acumulou N falhas na janela, nega antes de comparar
2. compare  -> timingSafeEqual sobre buffers de mesmo tamanho (hash SHA-256
               dos dois lados, para não vazar comprimento)
3. falha    -> incrementa contador por IP + grava admin_audit_logs
               (acao='admin_auth_denied', ip, rota, timestamp)
4. sucesso  -> zera contador, grava trilha só quando a chamada for de mutação
```

Reaproveita `checkRateLimit` / `clientIpFrom` que já existem — nada de infra nova.

### 2. Substituição das 57 comparações inline

Todo bloco no formato `if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) return { ok:false, error:"UNAUTHORIZED" }` vira uma chamada ao guard, preservando exatamente o mesmo shape de retorno de cada função (nenhum contrato de UI muda). Mesma coisa nas rotas `api/public/admin/*`, `api/public/queue/*` e `api/public/hooks/*`.

Regra que não será violada: o guard é importado **dentro** do handler (`await import`), como o resto do projeto faz, para não quebrar o code splitting de server functions.

### 3. Sessão de admin com validade no servidor

O TTL de 30 min passa a existir do lado do servidor: o guard aceita o token mestre e emite/valida um registro de sessão em `admin_settings`/tabela de sessões, com expiração real. Token mestre continua funcionando para cron/hooks; sessões humanas expiram de verdade.

### 4. Telemetria de auth no Jarvis

Nova checagem no detector: pico de `admin_auth_denied` vira alerta. Hoje um ataque de força bruta contra o painel é invisível.

## Escopo fechado — o que NÃO entra

Nada de mexer em pricing engine, dispatch, ledger, webhook do Mercado Pago ou SEO nesta versão. Só a camada de autorização. Testes existentes (600+) devem passar sem alteração de contrato.

## Riscos e mitigação

- Risco: uma função perder o guard na substituição em massa → mitigado por um teste que varre todos os `*.functions.ts` e falha se algum handler tocar o cliente administrativo sem passar pelo guard ou estar numa allowlist pública explícita.
- Risco: lockout derrubar o dono → limite alto (ex. 10 falhas/10 min por IP) e bypass do token mestre para hooks de cron.

## Cobrança — pontos cegos que continuam abertos depois disso

1. `ADMIN_TOKEN` continua sendo segredo compartilhado sem rotação. Você quer migrar o painel para Supabase Auth + `has_role` de verdade, ou vai manter chave mestra indefinidamente?
2. Existem 12 server functions que tocam o cliente administrativo sem nenhum guard porque são públicas por desenho (`criarPedido`, `redeemMysteryBox`, `consultarPedidoPublico`, `getBestsellers`...). Elas bypassam RLS para trabalho legítimo — mas `redeemMysteryBox` concede bônus a partir de um `pedidoId` adivinhável em UUID e sem rate limit. Isso entra na v607 ou fica para a v608?
3. `portalLimited` e o rate limit falham *open* (erro no limitador = passa). Sob ataque, o limitador é a primeira coisa a cair. Quer inverter para fail-closed no admin?
