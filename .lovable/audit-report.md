# Auditoria de Ponta a Ponta

Gerado por `npm run audit` — 2026-08-01T11:25:43.022Z

Arquivos lidos: 431

| Gravidade | Qtd |
|---|---|
| bloqueante | 0 |
| atencao | 110 |
| nota | 454 |

## arquivo-orfao (2)

- **atencao** `src/router.tsx` — ninguém importa este arquivo
- **atencao** `src/start.ts` — ninguém importa este arquivo

## nada-fake (3)

- **atencao** `src/lib/whatsapp-admin.server.ts` — linha 108: /** Alerta universal: TODO pedido pago (com sucesso ou aguardando provisão). */
- **atencao** `src/lib/whatsapp-admin.server.ts` — linha 193: /** Alerta universal em TODO pedido pago (sem PIX, sem botão). Não lança. */
- **atencao** `src/routes/api/public/mp-webhook.ts` — linha 245: // pedido para que TODO o fluxo abaixo (que busca por mercado_pago_id)

## seo-head (18)

- **atencao** `src/routes/admin-health-catalog.tsx` — head() sem description
- **atencao** `src/routes/admin-health-catalog.tsx` — head() sem og:title
- **atencao** `src/routes/admin-health-catalog.tsx` — head() sem og:description
- **atencao** `src/routes/admin.catalog.tsx` — head() sem description
- **atencao** `src/routes/admin.catalog.tsx` — head() sem og:title
- **atencao** `src/routes/admin.catalog.tsx` — head() sem og:description
- **atencao** `src/routes/admin.scripts.tsx` — head() sem description
- **atencao** `src/routes/admin.scripts.tsx` — head() sem og:title
- **atencao** `src/routes/admin.scripts.tsx` — head() sem og:description
- **atencao** `src/routes/admin.tsx` — head() sem og:title
- **atencao** `src/routes/admin.tsx` — head() sem og:description
- **atencao** `src/routes/dashboard.seo.tsx` — head() sem og:title
- **atencao** `src/routes/dashboard.seo.tsx` — head() sem og:description
- **atencao** `src/routes/diagnostico.tsx` — head() sem og:title
- **atencao** `src/routes/diagnostico.tsx` — head() sem og:description
- **atencao** `src/routes/unsubscribe.tsx` — head() sem description
- **atencao** `src/routes/unsubscribe.tsx` — head() sem og:title
- **atencao** `src/routes/unsubscribe.tsx` — head() sem og:description

## serverfn-modulo-fino (87)

- **atencao** `src/lib/admin-session.functions.ts` — linha 4: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **atencao** `src/lib/admin.functions.ts` — linha 34: const adminInput = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/admin.functions.ts` — linha 36: function checkToken(token: string) {
- **atencao** `src/lib/admin.functions.ts` — linha 438: const MARGEM_MINIMA_PCT = 20;
- **atencao** `src/lib/affiliate.functions.ts` — linha 8: const signupSchema = z.object({
- **atencao** `src/lib/affiliate.functions.ts` — linha 19: const SITE = "https://www.boostgg.com.br";
- **atencao** `src/lib/affiliate.functions.ts` — linha 101: const loginSchema = z.object({
- **atencao** `src/lib/affiliates-admin.functions.ts` — linha 5: const tokenOnly = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/affiliates-admin.functions.ts` — linha 7: function auth(token: string): boolean {
- **atencao** `src/lib/audit.functions.ts` — linha 9: const input = z.object({ token: z.string().min(8), fornecedorId: z.string().min(1) });
- **atencao** `src/lib/audit.functions.ts` — linha 10: const tokenOnlyInput = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/audit.functions.ts` — linha 32: const PIX_RATE = 0.0099; // 0,99% MP PIX aprox.
- **atencao** `src/lib/audit.functions.ts` — linha 34: async function buildContingencyAuditRows(): Promise<AuditRow[]> {
- **atencao** `src/lib/audit.functions.ts` — linha 63: const USED_IDS = new Set<number>([
- **atencao** `src/lib/autonomia-flags.functions.ts` — linha 8: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **atencao** `src/lib/autonomia-flags.functions.ts` — linha 10: const FLAGS = ACOES.filter((a) => a.flag).map((a) => ({
- **atencao** `src/lib/backup-drill.functions.ts` — linha 8: const CRITICAL_TABLES = [
- **atencao** `src/lib/bench-autonomo.functions.ts` — linha 6: const tokenInput = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/bench-autonomo.functions.ts` — linha 8: function authorized(token: string): boolean {
- **atencao** `src/lib/bench.functions.ts` — linha 13: const input = z.object({
- **atencao** `src/lib/bench.functions.ts` — linha 19: function authorized(token: string): boolean {
- **atencao** `src/lib/canary.functions.ts` — linha 4: function checkToken(token: string) {
- **atencao** `src/lib/canary.functions.ts` — linha 9: const tokenIn = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/catalog-raiox.functions.ts` — linha 6: const input = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/catalog-raiox.functions.ts` — linha 27: function classifica(campo: string): MudancaLinha["tipo"] {
- **atencao** `src/lib/catalog-telemetry.functions.ts` — linha 6: const input = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/catalog-telemetry.functions.ts` — linha 8: function checkToken(token: string) {
- **atencao** `src/lib/claude-inspect.functions.ts` — linha 12: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **atencao** `src/lib/consulta-pedido.functions.ts` — linha 6: const input = z.object({ pedidoId: z.string().min(4).max(60) });
- **atencao** `src/lib/contador-inscritos.functions.ts` — linha 14: const input = z.object({
- **atencao** `src/lib/contador-inscritos.functions.ts` — linha 23: const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/
- **atencao** `src/lib/contador-inscritos.functions.ts` — linha 34: const RE_CONTAGEM =
- **atencao** `src/lib/contador-inscritos.functions.ts` — linha 37: export function extrairInscritosTexto(html: string, handle?: string): string | null {
- **atencao** `src/lib/contador-inscritos.functions.ts` — linha 60: export function parseInscritos(txt: string): number | null {
- **atencao** `src/lib/dispatch-log.functions.ts` — linha 7: const input = z.object({
- **atencao** `src/lib/dispatch-log.functions.ts` — linha 15: function authorized(token: string): boolean {
- **atencao** `src/lib/fornecedores.functions.ts` — linha 4: const tokenInput = z.object({ token: z.string().min(8) });
- **atencao** `src/lib/fornecedores.functions.ts` — linha 6: function checkToken(token: string) {
- **atencao** `src/lib/fornecedores.functions.ts` — linha 65: function painelFromApiUrl(apiUrl: string | null | undefined): string | null {
- **atencao** `src/lib/fornecedores.functions.ts` — linha 77: function pixFor(slug: string): string | null {
- … e mais 47

## arquivo-gigante (10)

- **nota** `src/integrations/supabase/types.ts` — 2336 linhas (> 600)
- **nota** `src/lib/admin.functions.ts` — 857 linhas (> 600)
- **nota** `src/lib/pedidos.functions.ts` — 728 linhas (> 600)
- **nota** `src/lib/pricing-cache.server.ts` — 779 linhas (> 600)
- **nota** `src/lib/pricing-engine.server.ts` — 911 linhas (> 600)
- **nota** `src/routes/admin.tsx` — 2474 linhas (> 600)
- **nota** `src/routes/api/public/mp-webhook.ts` — 840 linhas (> 600)
- **nota** `src/routes/blog.$slug.tsx` — 723 linhas (> 600)
- **nota** `src/routes/index.tsx` — 1421 linhas (> 600)
- **nota** `src/routes/tiktok.tsx` — 636 linhas (> 600)

## console-log (12)

- **nota** `src/lib/admin.functions.ts` — 1 ocorrência(s)
- **nota** `src/lib/jivo-scripts.ts` — 1 ocorrência(s)
- **nota** `src/lib/pedidos.functions.ts` — 3 ocorrência(s)
- **nota** `src/lib/pricing-cache.server.ts` — 3 ocorrência(s)
- **nota** `src/lib/pricing-engine.server.ts` — 7 ocorrência(s)
- **nota** `src/lib/smmhype.server.ts` — 1 ocorrência(s)
- **nota** `src/lib/tiktok-events-api.server.ts` — 1 ocorrência(s)
- **nota** `src/routes/api/public/mp-webhook.ts` — 9 ocorrência(s)
- **nota** `src/routes/api/public/telegram/webhook.ts` — 1 ocorrência(s)
- **nota** `src/routes/email/unsubscribe.ts` — 1 ocorrência(s)
- **nota** `src/routes/lovable/email/suppression.ts` — 1 ocorrência(s)
- **nota** `src/routes/lovable/email/transactional/send.ts` — 2 ocorrência(s)

## cor-hardcoded (432)

- **nota** `src/components/AdminAuditLog.tsx` — linha 38
- **nota** `src/components/AdminAuditLog.tsx` — linha 53
- **nota** `src/components/AdminAuditLog.tsx` — linha 56
- **nota** `src/components/AdminAuditLog.tsx` — linha 57
- **nota** `src/components/AdminAuditLog.tsx` — linha 62
- **nota** `src/components/AdminCostAlert.tsx` — linha 41
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 47
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 50
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 73
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 74
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 75
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 76
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 77
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 78
- **nota** `src/components/AdminHealthSemaphore.tsx` — linha 84
- **nota** `src/components/AuditoriaJarvis.tsx` — linha 161
- **nota** `src/components/AuditoriaJarvis.tsx` — linha 170
- **nota** `src/components/AuditoriaJarvis.tsx` — linha 198
- **nota** `src/components/AuditoriaJarvis.tsx` — linha 203
- **nota** `src/components/AuditoriaJarvis.tsx` — linha 223
- **nota** `src/components/AuditoriaJarvis.tsx` — linha 225
- **nota** `src/components/AuditoriaJarvis.tsx` — linha 235
- **nota** `src/components/AutonomiaPanel.tsx` — linha 40
- **nota** `src/components/AutonomiaPanel.tsx` — linha 45
- **nota** `src/components/AutonomiaPanel.tsx` — linha 47
- **nota** `src/components/AutonomiaPanel.tsx` — linha 48
- **nota** `src/components/AutonomiaPanel.tsx` — linha 51
- **nota** `src/components/AutonomiaPanel.tsx` — linha 65
- **nota** `src/components/BenchPanel.tsx` — linha 87
- **nota** `src/components/BenefitsGrid.tsx` — linha 61
- **nota** `src/components/BrandHeader.tsx` — linha 12
- **nota** `src/components/CanaryPanel.tsx` — linha 119
- **nota** `src/components/CanaryPanel.tsx` — linha 134
- **nota** `src/components/CanaryPanel.tsx` — linha 149
- **nota** `src/components/CanaryPanel.tsx` — linha 156
- **nota** `src/components/CanaryPanel.tsx` — linha 164
- **nota** `src/components/CanaryPanel.tsx` — linha 167
- **nota** `src/components/CanaryPanel.tsx` — linha 170
- **nota** `src/components/CanaryPanel.tsx` — linha 174
- **nota** `src/components/CanaryPanel.tsx` — linha 177
- … e mais 392

