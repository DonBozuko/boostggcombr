import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuditRow = { id: string; admin_email: string; action: string; detail: unknown; created_at: string };

export async function logAdminAction(action: string, detail?: Record<string, unknown>) {
  try {
    const { data: u } = await supabase.auth.getUser();
    const email = u.user?.email;
    if (!email) return;
    await supabase.from("admin_audit_logs").insert({ admin_email: email, action, detail: detail ?? null });
  } catch {
    /* silent */
  }
}

export function AdminAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("admin_audit_logs")
      .select("id, admin_email, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void logAdminAction("audit:view");
  }, []);

  return (
    <section className="rounded-xl border border-red-500/40 bg-black/60 backdrop-blur-xl p-4 shadow-[0_0_18px_rgba(255,0,40,0.25)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-red-300">
          🛡️ Auditor do Administrador · RLS Master
        </h3>
        <button
          onClick={load}
          disabled={loading}
          className="text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
        >
          {loading ? "carregando..." : "↻ recarregar"}
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto space-y-1.5">
        {rows.length === 0 ? (
          <div className="text-xs text-white/40 font-mono">// nenhum evento registrado ainda</div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] font-mono">
              <div className="flex justify-between gap-2 text-white/50">
                <span>{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                <span className="text-red-300">{r.admin_email}</span>
              </div>
              <div className="text-emerald-200 mt-0.5">→ {r.action}</div>
              {r.detail ? <div className="text-white/40 text-[10px] truncate">{JSON.stringify(r.detail)}</div> : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
