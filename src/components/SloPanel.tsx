// v220 — Painel SLO: métricas reais dos últimos 7 dias.
// Sem gráfico bonito: números crus, os que importam.
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSloMetrics } from "@/lib/slo-panel.functions";
import { Activity, RefreshCw } from "lucide-react";

type Metrics = Awaited<ReturnType<typeof getSloMetrics>>;

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtMin(m: number | null) {
  if (m == null) return "—";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}m` : `${h}h`;
}

export function SloPanel({ token }: { token: string }) {
  const run = useServerFn(getSloMetrics);
  const [m, setM] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const r = await run({ data: { token } });
      setM(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [run, token]);

  useEffect(() => { void load(); const id = window.setInterval(load, 60_000); return () => window.clearInterval(id); }, [load]);

  const ok = m?.ok;
  const successColor = (m?.successRate ?? 100) >= 95 ? "text-emerald-300" : (m?.successRate ?? 0) >= 85 ? "text-amber-300" : "text-red-300";
  const refundColor = (m?.refundRatePct ?? 0) <= 2 ? "text-emerald-300" : (m?.refundRatePct ?? 0) <= 5 ? "text-amber-300" : "text-red-300";

  return (
    <section className="rounded-xl border border-cyan-500/40 bg-black/60 backdrop-blur-xl p-4 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300 flex items-center gap-2">
          <Activity size={14} /> SLO · Últimos 7 dias
        </h3>
        <button onClick={load} className="text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 rounded px-2 py-1 flex items-center gap-1">
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> {loading ? "..." : "↻"}
        </button>
      </div>

      {!m && <div className="text-[11px] text-white/50 font-mono">carregando métricas...</div>}
      {m && !ok && <div className="text-[11px] text-red-300 font-mono">Token inválido — recarrega o admin.</div>}

      {m && ok && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className="rounded-lg border border-white/10 bg-black/40 p-2">
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Taxa Sucesso</div>
              <div className={`text-lg font-bold ${successColor}`}>{m.successRate}%</div>
              <div className="text-white/40 text-[9px]">alvo ≥ 95%</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-2">
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Taxa Refund</div>
              <div className={`text-lg font-bold ${refundColor}`}>{m.refundRatePct}%</div>
              <div className="text-white/40 text-[9px]">alvo ≤ 2%</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-2">
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Entrega p95</div>
              <div className="text-lg font-bold text-cyan-200">{fmtMin(m.deliveryLatency.p95Min)}</div>
              <div className="text-white/40 text-[9px]">amostra {m.deliveryLatency.sample}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/40 p-2">
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Receita 7d</div>
              <div className="text-lg font-bold text-emerald-200">{brl(m.totals.revenue_brl)}</div>
              <div className="text-white/40 text-[9px]">{m.totals.pagos} pedidos pagos</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px]">
            <Chip label="Entregues" value={m.totals.entregues} color="emerald" />
            <Chip label="Processando" value={m.totals.processando} color="cyan" />
            <Chip label="Refunded" value={m.totals.refunded} color="amber" />
            <Chip label="Aguard. Aprov." value={m.totals.awaiting_approval} color="red" />
            <Chip label="Margin Hold" value={m.totals.margin_hold} color="red" />
            <Chip label="SMM Failed" value={m.totals.smm_failed} color="red" />
          </div>

          <div className="mt-3">
            <div className="text-white/40 uppercase text-[9px] tracking-wider mb-1">Por dia (pagos · entregues · refund · falha)</div>
            <div className="space-y-1">
              {m.perDay.map((d) => (
                <div key={d.day} className="grid grid-cols-5 gap-2 text-[10px] font-mono border-b border-white/5 py-1">
                  <span className="text-white/60">{d.day}</span>
                  <span className="text-emerald-300">{d.pagos}</span>
                  <span className="text-cyan-300">{d.entregues}</span>
                  <span className="text-amber-300">{d.refunded}</span>
                  <span className="text-red-300">{d.failed}</span>
                </div>
              ))}
              {m.perDay.length === 0 && <div className="text-white/40 text-[10px]">sem dados ainda</div>}
            </div>
          </div>

          <div className="mt-3 text-[9px] text-white/40 font-mono">
            atualizado {new Date(m.generatedAt).toLocaleString("pt-BR")} · latência = dispatched_at → last_reconciled_at
          </div>
        </>
      )}
    </section>
  );
}

function Chip({ label, value, color }: { label: string; value: number; color: string }) {
  const cls: Record<string, string> = {
    emerald: "border-emerald-500/40 text-emerald-200",
    cyan: "border-cyan-500/40 text-cyan-200",
    amber: "border-amber-500/40 text-amber-200",
    red: "border-red-500/40 text-red-200",
  };
  return (
    <div className={`rounded-md border ${cls[color] ?? cls.cyan} bg-black/40 px-2 py-1 flex flex-col`}>
      <span className="uppercase text-[8px] tracking-wider text-white/40">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}
