# Auditoria de Ponta a Ponta

Gerado por `npm run audit` — 2026-08-01T11:29:26.882Z

Arquivos lidos: 432

| Gravidade | Qtd |
|---|---|
| bloqueante | 0 |
| atencao | 26 |
| nota | 515 |

## serverfn-modulo-fino (87)

- **atencao** `src/lib/admin.functions.ts` — linha 36: function checkToken(token: string) {
- **atencao** `src/lib/affiliates-admin.functions.ts` — linha 7: function auth(token: string): boolean {
- **atencao** `src/lib/audit.functions.ts` — linha 34: async function buildContingencyAuditRows(): Promise<AuditRow[]> {
- **atencao** `src/lib/bench-autonomo.functions.ts` — linha 8: function authorized(token: string): boolean {
- **atencao** `src/lib/bench.functions.ts` — linha 19: function authorized(token: string): boolean {
- **atencao** `src/lib/canary.functions.ts` — linha 4: function checkToken(token: string) {
- **atencao** `src/lib/catalog-raiox.functions.ts` — linha 27: function classifica(campo: string): MudancaLinha["tipo"] {
- **atencao** `src/lib/catalog-telemetry.functions.ts` — linha 8: function checkToken(token: string) {
- **atencao** `src/lib/contador-inscritos.functions.ts` — linha 37: export function extrairInscritosTexto(html: string, handle?: string): string | null {
- **atencao** `src/lib/contador-inscritos.functions.ts` — linha 60: export function parseInscritos(txt: string): number | null {
- **atencao** `src/lib/dispatch-log.functions.ts` — linha 15: function authorized(token: string): boolean {
- **atencao** `src/lib/fornecedores.functions.ts` — linha 6: function checkToken(token: string) {
- **atencao** `src/lib/fornecedores.functions.ts` — linha 65: function painelFromApiUrl(apiUrl: string | null | undefined): string | null {
- **atencao** `src/lib/fornecedores.functions.ts` — linha 77: function pixFor(slug: string): string | null {
- **atencao** `src/lib/gerador-legenda.functions.ts` — linha 20: function localFallback(tema: string): Legenda {
- **atencao** `src/lib/gsc-inspect.functions.ts` — linha 26: async function inspectOne(path: string): Promise<InspectRow> {
- **atencao** `src/lib/jarvis-noc.functions.ts` — linha 5: function checkToken(token: string) {
- **atencao** `src/lib/jarvis.functions.ts` — linha 13: function checkToken(token: string | undefined) {
- **atencao** `src/lib/monitor.functions.ts` — linha 6: function checkToken(token: string) {
- **atencao** `src/lib/reseller-apply.functions.ts` — linha 77: function auth(token: string): boolean {
- **atencao** `src/lib/reseller-portal.functions.ts` — linha 15: async function ip(): Promise<string> {
- **atencao** `src/lib/reseller-portal.functions.ts` — linha 25: async function limited(bucket: string, max: number, windowSec: number): Promise<boolean> {
- **atencao** `src/lib/resellers.functions.ts` — linha 9: function auth(token: string): boolean {
- **atencao** `src/lib/roas.functions.ts` — linha 26: function group(
- **atencao** `src/lib/services-cache.functions.ts` — linha 6: function checkToken(token: string) {
- **atencao** `src/lib/simulate-purchase.functions.ts` — linha 17: function fmtBrl(v: number): string {
- **nota** `src/lib/admin-session.functions.ts` — linha 4: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **nota** `src/lib/admin.functions.ts` — linha 34: const adminInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/admin.functions.ts` — linha 438: const MARGEM_MINIMA_PCT = 20;
- **nota** `src/lib/affiliate.functions.ts` — linha 8: const signupSchema = z.object({
- **nota** `src/lib/affiliate.functions.ts` — linha 19: const SITE = "https://www.boostgg.com.br";
- **nota** `src/lib/affiliate.functions.ts` — linha 101: const loginSchema = z.object({
- **nota** `src/lib/affiliates-admin.functions.ts` — linha 5: const tokenOnly = z.object({ token: z.string().min(8) });
- **nota** `src/lib/audit.functions.ts` — linha 9: const input = z.object({ token: z.string().min(8), fornecedorId: z.string().min(1) });
- **nota** `src/lib/audit.functions.ts` — linha 10: const tokenOnlyInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/audit.functions.ts` — linha 32: const PIX_RATE = 0.0099; // 0,99% MP PIX aprox.
- **nota** `src/lib/audit.functions.ts` — linha 63: const USED_IDS = new Set<number>([
- **nota** `src/lib/autonomia-flags.functions.ts` — linha 8: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **nota** `src/lib/autonomia-flags.functions.ts` — linha 10: const FLAGS = ACOES.filter((a) => a.flag).map((a) => ({
- **nota** `src/lib/backup-drill.functions.ts` — linha 8: const CRITICAL_TABLES = [
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

