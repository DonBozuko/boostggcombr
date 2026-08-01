# Auditoria de Ponta a Ponta

Gerado por `npm run audit` — 2026-08-01T11:40:26.833Z

Arquivos lidos: 442

| Gravidade | Qtd |
|---|---|
| bloqueante | 0 |
| atencao | 0 |
| nota | 498 |

## arquivo-gigante (10)

- **nota** `src/integrations/supabase/types.ts` — 2336 linhas (> 600)
- **nota** `src/lib/admin.functions.ts` — 852 linhas (> 600)
- **nota** `src/lib/pedidos.functions.ts` — 728 linhas (> 600)
- **nota** `src/lib/pricing-cache.server.ts` — 779 linhas (> 600)
- **nota** `src/lib/pricing-engine.server.ts` — 911 linhas (> 600)
- **nota** `src/routes/admin.tsx` — 2474 linhas (> 600)
- **nota** `src/routes/api/public/mp-webhook.ts` — 840 linhas (> 600)
- **nota** `src/routes/blog.$slug.tsx` — 723 linhas (> 600)
- **nota** `src/routes/index.tsx` — 1421 linhas (> 600)
- **nota** `src/routes/tiktok.tsx` — 636 linhas (> 600)

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

## serverfn-modulo-fino (56)

- **nota** `src/lib/admin-session.functions.ts` — linha 4: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **nota** `src/lib/admin.functions.ts` — linha 34: const adminInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/admin.functions.ts` — linha 433: const MARGEM_MINIMA_PCT = 20;
- **nota** `src/lib/affiliate.functions.ts` — linha 8: const signupSchema = z.object({
- **nota** `src/lib/affiliate.functions.ts` — linha 19: const SITE = "https://www.boostgg.com.br";
- **nota** `src/lib/affiliate.functions.ts` — linha 101: const loginSchema = z.object({
- **nota** `src/lib/affiliates-admin.functions.ts` — linha 5: const tokenOnly = z.object({ token: z.string().min(8) });
- **nota** `src/lib/audit.functions.ts` — linha 9: const input = z.object({ token: z.string().min(8), fornecedorId: z.string().min(1) });
- **nota** `src/lib/audit.functions.ts` — linha 10: const tokenOnlyInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/audit.functions.ts` — linha 25: const USED_IDS = new Set<number>([
- **nota** `src/lib/autonomia-flags.functions.ts` — linha 8: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **nota** `src/lib/autonomia-flags.functions.ts` — linha 10: const FLAGS = ACOES.filter((a) => a.flag).map((a) => ({
- **nota** `src/lib/backup-drill.functions.ts` — linha 8: const CRITICAL_TABLES = [
- **nota** `src/lib/bench-autonomo.functions.ts` — linha 6: const tokenInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/bench.functions.ts` — linha 13: const input = z.object({
- **nota** `src/lib/canary.functions.ts` — linha 5: const tokenIn = z.object({ token: z.string().min(8) });
- **nota** `src/lib/catalog-raiox.functions.ts` — linha 7: const input = z.object({ token: z.string().min(8) });
- **nota** `src/lib/catalog-telemetry.functions.ts` — linha 6: const input = z.object({ token: z.string().min(8) });
- **nota** `src/lib/claude-inspect.functions.ts` — linha 12: const ADMIN_EMAIL = "fabiano.majestic@gmail.com";
- **nota** `src/lib/consulta-pedido.functions.ts` — linha 6: const input = z.object({ pedidoId: z.string().min(4).max(60) });
- **nota** `src/lib/contador-inscritos.functions.ts` — linha 15: const input = z.object({
- **nota** `src/lib/contador-inscritos.functions.ts` — linha 24: const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/
- **nota** `src/lib/dispatch-log.functions.ts` — linha 7: const input = z.object({
- **nota** `src/lib/fornecedores.functions.ts` — linha 4: const tokenInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/gerador-legenda.functions.ts` — linha 5: const TONES = ["persuasivo", "engracado", "inspirador", "profissional", "polemico", "romantico"] as 
- **nota** `src/lib/gerador-legenda.functions.ts` — linha 6: const OBJETIVOS = ["engajamento", "vendas", "seguidores", "autoridade", "trafego"] as const;
- **nota** `src/lib/gerador-legenda.functions.ts` — linha 8: const input = z.object({
- **nota** `src/lib/insights.functions.ts` — linha 4: const adminInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/jarvis-noc.functions.ts` — linha 4: const adminInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/jarvis-noc.functions.ts` — linha 6: const TABLES = [
- **nota** `src/lib/jarvis-noc.functions.ts` — linha 134: const CRITICAL_KEYWORDS = ["deletar","delete","drop","apagar","remover api","trocar chave","alterar 
- **nota** `src/lib/jarvis-script-gen.functions.ts` — linha 4: const NETWORKS = ["instagram", "tiktok", "facebook", "youtube", "telegram"] as const;
- **nota** `src/lib/jarvis-script-gen.functions.ts` — linha 24: const HOOKS_MATRIX = [
- **nota** `src/lib/jarvis-script-gen.functions.ts` — linha 77: const genInput = z.object({
- **nota** `src/lib/monitor.functions.ts` — linha 4: const adminInput = z.object({ token: z.string().min(8) });
- **nota** `src/lib/mystery-box.functions.ts` — linha 7: const MIN_QTY = 200; // v190 — alinhado à UI (Bônus Especial promete "acima de 200 unidades")
- **nota** `src/lib/mystery-box.functions.ts` — linha 8: const MB_MARKER = /MB_REDEEMED:(\d+)/i;
- **nota** `src/lib/mystery-box.functions.ts` — linha 10: const input = z.object({
- **nota** `src/lib/pedidos.functions.ts` — linha 4: const pedidoSchema = z.object({
- **nota** `src/lib/pedidos.functions.ts` — linha 23: const utmClean = (v: string | null | undefined) =>
- … e mais 16

