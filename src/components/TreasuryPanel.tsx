import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { treasurySnapshot, type TreasurySnapshot } from "@/lib/treasury.functions";

function brl(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function TreasuryPanel({ token }: { token: string }) {
  const fn = useServerFn(treasurySnapshot);
  const [snap, setSnap] = useState<TreasurySnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try { setSnap(await fn({ data: { token } })); } catch { setSnap({ ok: false, error: "NET" }); }
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [token]);

  if (!snap || !snap.ok) {
    return (
      <section className="rounded-xl border border-amber-400/40 bg-amber-950/20 p-3 text-amber-200 text-xs">
        💰 Tesouraria · {loading ? "carregando…" : (snap as any)?.error ?? "sem dados"}
      </section>
    );
  }
  const Cell = ({ label, v, sub }: { label: string; v: string; sub?: string }) => (
    <div className="rounded-lg border border-cyan-400/30 bg-black/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-cyan-300/80">{label}</div>
      <div className="text-base font-bold text-white">{v}</div>
      {sub && <div className="text-[10px] text-white/50">{sub}</div>}
    </div>
  );
  return (
    <section className="rounded-xl border border-cyan-400/40 bg-cyan-950/20 backdrop-blur-xl p-3 shadow-[0_0_18px_rgba(0,242,254,0.25)]">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">💰 Tesouraria Inteligente</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!snap.ok) return;
              const rows = [
                ["occurred_at", "network", "faturamento", "lucro_liquido"],
                ...snap.ultimas.map((u) => [u.occurred_at, u.network ?? "", String(u.faturamento), String(u.lucro_liquido)]),
              ];
              const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `livro-contabil-${Date.now()}.csv`;
              document.body.appendChild(a); a.click(); a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 2000);
            }}
            className="text-[10px] px-2 py-1 rounded-md border border-emerald-400/50 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
          >
            📥 EXPORTAR LIVRO (CSV)
          </button>
          <button onClick={load} className="text-[10px] text-cyan-200/70 hover:text-cyan-100">↻ atualizar</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Cell label="Lucro hoje" v={brl(snap.diario.lucro)} sub={`Fat: ${brl(snap.diario.fat)}`} />
        <Cell label="Lucro 7d" v={brl(snap.semanal.lucro)} sub={`Fat: ${brl(snap.semanal.fat)}`} />
        <Cell label="Lucro 30d" v={brl(snap.mensal.lucro)} sub={`Fat: ${brl(snap.mensal.fat)}`} />
        <Cell label="Previsão 30d" v={brl(snap.previsao30d)} sub="base 7d × 30" />
      </div>
      <div className="mt-2 text-[10px] text-white/60">
        Taxa Pix hoje: {brl(snap.diario.pix)} · Custo API: {brl(snap.diario.custo)}
      </div>
      {snap.ultimas.length > 0 && (
        <ul className="mt-2 text-[10px] font-mono text-cyan-100/80 space-y-0.5 max-h-24 overflow-y-auto">
          {snap.ultimas.map((u, i) => (
            <li key={i}>
              {new Date(u.occurred_at).toLocaleString("pt-BR")} · {u.network ?? "?"} · {brl(u.faturamento)} → {brl(u.lucro_liquido)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
