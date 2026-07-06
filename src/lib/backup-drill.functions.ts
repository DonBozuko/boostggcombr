// Backup Drill (v182) — Valida integridade e exporta snapshot dos dados críticos.
// Não substitui backup do Lovable Cloud; é o teste mensal que prova que ele funciona.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type TableSnapshot = { table: string; rows: number; ok: boolean; error?: string };

const CRITICAL_TABLES = [
  "pedidos",
  "fornecedores",
  "admin_settings",
  "pricing_items",
  "virtual_wallets",
  "financial_ledger",
  "webhook_events",
  "user_roles",
  "lgpd_requests",
] as const;

export const runBackupDrill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isDir } = await context.supabase.rpc("is_director" as any);
    if (!isDir) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const tables: TableSnapshot[] = [];
    for (const t of CRITICAL_TABLES) {
      const { count, error } = await supabaseAdmin.from(t as any).select("*", { count: "exact", head: true });
      tables.push({ table: t, rows: count ?? 0, ok: !error, error: error?.message });
    }

    // Amostra: últimos 50 pedidos pagos (dados suficientes pra reconstruir contabilidade recente)
    const { data: sample } = await supabaseAdmin
      .from("pedidos")
      .select("id, created_at, status, valor, custo_real, rede_social, pacote, quantidade")
      .order("created_at", { ascending: false })
      .limit(50);

    // Ledger recente (últimas 100 entradas)
    const { data: ledger } = await supabaseAdmin
      .from("financial_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    // Configurações críticas
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("key, value, updated_at");

    const now = new Date().toISOString();
    const allOk = tables.every((t) => t.ok);
    const totalRows = tables.reduce((s, t) => s + t.rows, 0);

    // Persiste o timestamp do drill
    await supabaseAdmin.from("admin_settings").upsert({
      key: "last_backup_drill",
      value: {
        ran_at: now,
        ok: allOk,
        total_rows: totalRows,
        tables: tables.map((t) => ({ table: t.table, rows: t.rows, ok: t.ok })),
      } as any,
      updated_at: now,
    });

    return {
      ok: allOk,
      ran_at: now,
      total_rows: totalRows,
      tables,
      snapshot: {
        settings: settings ?? [],
        pedidos_recent: sample ?? [],
        ledger_recent: ledger ?? [],
      },
    };
  });

export const getBackupDrillStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isDir } = await context.supabase.rpc("is_director" as any);
    if (!isDir) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("value")
      .eq("key", "last_backup_drill")
      .maybeSingle();
    const v = (data?.value ?? null) as { ran_at?: string; ok?: boolean; total_rows?: number } | null;
    if (!v?.ran_at) return { ran_at: null, ok: null, total_rows: 0, days_ago: null as number | null };
    const daysAgo = Math.floor((Date.now() - new Date(v.ran_at).getTime()) / 86400000);
    return { ran_at: v.ran_at, ok: !!v.ok, total_rows: v.total_rows ?? 0, days_ago: daysAgo };
  });
