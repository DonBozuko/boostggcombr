import { getAdminToken } from "@/lib/admin-token-store";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getJarvisTriage, type TriageDigest } from "@/lib/jarvis-triage.functions";
import { resolveJarvisAlerts } from "@/lib/jarvis-resolve.functions";
import { toast } from "sonner";


/**
 * v223 — Semáforo Único do Admin
 * Substitui a leitura de 8 luzinhas + 3 painéis por UM card no topo.
 * Verde → ignora; Amarelo → resolve quando puder; Vermelho → clica pra ir direto.
 */
export function AdminHealthSemaphore() {
  const fetchTriage = useServerFn(getJarvisTriage);
  const resolve = useServerFn(resolveJarvisAlerts);
  const [d, setD] = useState<TriageDigest | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);


  const load = useCallback(async () => {
    try {
      const token = getAdminToken();
      if (!token) { setD(null); return; }
      const r = await fetchTriage({ data: { token } });
      setD(r as TriageDigest);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [fetchTriage]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const handleFixAll = async () => {
    const token = getAdminToken();
    if (!token || !d) return;
    setFixing(true);
    try {
      const ids = d.actions.map(a => a.id).filter(Boolean);
      await resolve({ data: { token, ids } });
      toast.success("Comando de auto-cura enviado!");
      await load();
    } catch (e) {
      toast.error("Falha ao enviar comando de auto-cura.");
      console.error(e);
    } finally {
      setFixing(false);
    }
  };

  const status = d?.status ?? "green";

  const palette = {
    green:  { ring: "ring-emerald-400/60", bg: "from-emerald-950/60 to-black/40", dot: "bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.9)]", text: "text-emerald-200" },
    yellow: { ring: "ring-amber-400/60",   bg: "from-amber-950/60 to-black/40",   dot: "bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.9)]",   text: "text-amber-200" },
    red:    { ring: "ring-red-500/70",     bg: "from-red-950/70 to-black/40",     dot: "bg-red-500 shadow-[0_0_24px_rgba(239,68,68,1)] animate-pulse", text: "text-red-200" },
  }[status];

  return (
    <div className={`rounded-2xl border border-white/10 bg-gradient-to-r ${palette.bg} p-4 sm:p-5 ring-1 ${palette.ring}`}>
      <div className="flex items-start gap-4">
        <div className={`w-4 h-4 mt-1 rounded-full ${palette.dot} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] uppercase tracking-[0.2em] font-bold ${palette.text}`}>
            J.A.R.V.I.S. · Semáforo Único
          </div>
          <div className="text-white font-extrabold text-base sm:text-lg leading-tight mt-0.5">
            {loading ? "Lendo sinais…" : (d?.status === "green" ? "Tudo em ordem, pode relaxar..." : d?.headline)}
          </div>
          <div className="text-white/70 text-xs sm:text-sm mt-1">
            {d?.status === "green" ? "Nenhuma ação urgente. Sistema operando normal." : d?.summary}
          </div>

          {d && d.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {d.actions.map((a) => (
                <a
                  key={a.id}
                  href={a.href ?? "#"}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                    a.urgency === "high"
                      ? "bg-red-600 hover:bg-red-500 text-white border-red-400"
                      : a.urgency === "medium"
                      ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 border-amber-400/60"
                      : "bg-white/5 hover:bg-white/10 text-white/80 border-white/20"
                  }`}
                >
                  {a.label} →
                </a>
              ))}
            </div>
          )}

          {d && (d.counters.criticalAlerts > 0 || d.counters.stuckOrders > 0) && (
            <div className="mt-4">
              <button
                onClick={handleFixAll}
                disabled={fixing}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl border border-white/20 transition-all active:scale-95"
              >
                {fixing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Consertando...
                  </span>
                ) : (
                  <>🛠️ EXECUTAR AUTO-CURA (v612)</>
                )}
              </button>
            </div>


          )}
          {d && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
              <span>🔴 críticos: <b className="text-white/80">{d.counters.criticalAlerts}</b></span>
              {d.counters.databaseErrors > 0 && (
                <span className="text-red-400 font-bold">⚠️ DB: <b>{d.counters.databaseErrors}</b></span>
              )}
              <span>🟡 avisos: <b className="text-white/80">{d.counters.warningAlerts}</b></span>
              {d.counters.invalidTargetAnomalies > 0 && (
                <span className="text-amber-400">👤 perfil: <b>{d.counters.invalidTargetAnomalies}</b></span>
              )}
              <span>⏱ pedidos: <b className="text-white/80">{d.counters.stuckOrders}</b></span>
              <span>💰 saldo: <b className="text-white/80">{d.counters.lowBalanceProviders}</b></span>
              <span>🛒 Pix: <b className="text-white/80">{d.counters.pendingRecovery}</b></span>
            </div>
          )}
        </div>
        <button
          onClick={load}
          className="text-[10px] uppercase tracking-widest text-white/50 hover:text-white/90 border border-white/10 rounded-md px-2 py-1"
          title="Atualizar agora"
        >
          ↻
        </button>
      </div>
    </div>
  );
}
