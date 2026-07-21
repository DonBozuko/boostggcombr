// Backup Drill mensal — chamado por pg_cron.
// Roda o mesmo snapshot que a versão do painel, mas sem exigir sessão de diretor.
// Segurança: pg_cron envia o apikey (anon key). O endpoint só executa leitura + upsert
// de um único registro em admin_settings.last_backup_drill.
import { createFileRoute } from '@tanstack/react-router';

const CRITICAL_TABLES = [
  'pedidos',
  'fornecedores',
  'admin_settings',
  'pricing_items',
  'virtual_wallets',
  'financial_ledger',
  'webhook_events',
  'user_roles',
  'lgpd_requests',
] as const;

export const Route = createFileRoute('/api/public/hooks/backup-drill')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token =
          request.headers.get('x-admin-token') ??
          request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
          '';
        if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        const tables: { table: string; rows: number; ok: boolean }[] = [];
        for (const t of CRITICAL_TABLES) {
          const { count, error } = await supabaseAdmin
            .from(t as any)
            .select('*', { count: 'exact', head: true });
          tables.push({ table: t, rows: count ?? 0, ok: !error });
        }

        const now = new Date().toISOString();
        const allOk = tables.every((t) => t.ok);
        const totalRows = tables.reduce((s, t) => s + t.rows, 0);

        await supabaseAdmin.from('admin_settings').upsert({
          key: 'last_backup_drill',
          value: {
            ran_at: now,
            ok: allOk,
            total_rows: totalRows,
            source: 'cron_monthly',
            tables,
          } as any,
          updated_at: now,
        });

        return new Response(
          JSON.stringify({ ok: allOk, ran_at: now, total_rows: totalRows, tables }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  },
});
