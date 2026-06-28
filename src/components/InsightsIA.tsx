import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getInsightsIA, type InsightsPayload } from "@/lib/insights.functions";

const brl = (n: number) => `R$ ${n.toFixed(2)}`;

export function InsightsIA({ token }: { token: string }) {
  const fn = useServerFn(getInsightsIA);
  const [d, setD] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    let alive = true;
    const load = async () => {
      try {
        const r = await fn({ data: { token } });
        if (alive) setD(r);
      } finally { if (alive) setLoading(false); }
    };
    void load();
    const id = window.setInterval(load, 60_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [token, fn]);

  if (loading && !d) {
    return <div className="rounded-xl border border-cyan-500/30 bg-black/40 p-4 text-xs text-cyan-200/70">🧠 Insights IA carregando…</div>;
  }
  if (!d || !d.ok) {
    return <div className="rounded-xl border border-red-500/40 bg-red-950/30 p-4 text-xs text-red-200">Falha ao carregar Insights IA.</div>;
  }

  return (
    <section className="rounded-xl border border-cyan-500/40 bg-black/60 backdrop-blur-xl p-4 shadow-[0_0_18px_rgba(34,211,238,0.25)] space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">🧠 Insights IA · Autonomous Growth</h3>
        <span className="text-[10px] text-white/40">{d.totalPagos}/{d.totalGeral} pagos · atualiza 60s</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card label="Receita Hoje" value={brl(d.receita.dia)} accent="text-emerald-300" />
        <Card label="Receita Mês" value={brl(d.receita.mes)} accent="text-emerald-400" />
        <Card label="Receita Ano" value={brl(d.receita.ano)} accent="text-emerald-500" />
        <Card label="Ticket Médio" value={brl(d.ticketMedio)} accent="text-amber-300" />
        <Card label="Lucro Hoje" value={brl(d.lucro.dia)} accent="text-cyan-300" />
        <Card label="Lucro Mês" value={brl(d.lucro.mes)} accent="text-cyan-300" />
        <Card label="Lucro Ano" value={brl(d.lucro.ano)} accent="text-cyan-300" />
        <Card label="Conversão" value={`${d.conversao.toFixed(1)}%`} accent="text-fuchsia-300" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">Top fontes (utm_source)</div>
          {d.topUtm.length === 0 ? (
            <div className="text-[11px] text-white/40">Sem dados de origem ainda.</div>
          ) : d.topUtm.map((u) => (
            <div key={u.source} className="flex justify-between text-[11px] py-0.5 border-b border-white/5 last:border-0">
              <span className="text-white/80">{u.source}</span>
              <span className="text-emerald-300 font-mono">{brl(u.receita)} · {u.pagos}</span>
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-white/10 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">Horários de pico</div>
          {d.topHoras.length === 0 ? (
            <div className="text-[11px] text-white/40">Sem dados.</div>
          ) : d.topHoras.map((h) => (
            <div key={h.hora} className="flex justify-between text-[11px] py-0.5 border-b border-white/5 last:border-0">
              <span className="text-white/80">{String(h.hora).padStart(2, "0")}h</span>
              <span className="text-cyan-300 font-mono">{h.pagos} pedidos</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-amber-400/30 bg-amber-950/20 p-3">
        <div className="text-[10px] uppercase tracking-wider text-amber-300 mb-2">💡 Recomendações automáticas</div>
        {d.recomendacoes.length === 0 ? (
          <div className="text-[11px] text-white/60">Sem recomendações no momento.</div>
        ) : (
          <ul className="space-y-1">
            {d.recomendacoes.map((r, i) => (
              <li key={i} className="text-[11px] text-amber-100 leading-snug">→ {r}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-base font-extrabold ${accent}`}>{value}</div>
    </div>
  );
}
