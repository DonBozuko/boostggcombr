import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getRoasReport, type RoasReport, type RoasRow } from "@/lib/roas.functions";
import { Button } from "@/components/ui/button";

type Props = { token: string };

const JANELAS = [7, 14, 30, 60] as const;

function fmtBrl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Table({ title, rows, hint }: { title: string; rows: RoasRow[]; hint: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-black/20 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        <span className="text-[10px] text-white/40">{hint}</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-white/50 py-4 text-center">Sem dados na janela.</div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-white/50 text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left pb-1">Chave</th>
                <th className="text-right pb-1">Pedidos</th>
                <th className="text-right pb-1">Receita</th>
                <th className="text-right pb-1">Ticket</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {rows.map((r) => (
                <tr key={r.key} className="border-t border-border/20">
                  <td className="py-1 pr-2 font-mono truncate max-w-[180px]" title={r.key}>{r.key}</td>
                  <td className="py-1 text-right tabular-nums">{r.pedidos}</td>
                  <td className="py-1 text-right tabular-nums text-green-300">{fmtBrl(r.receitaBrl)}</td>
                  <td className="py-1 text-right tabular-nums text-white/60">{fmtBrl(r.ticketMedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function RoasPanel({ token }: Props) {
  const fetchRoas = useServerFn(getRoasReport);
  const [janela, setJanela] = useState<number>(30);
  const [data, setData] = useState<RoasReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async (dias: number) => {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetchRoas({ data: { adminToken: token, janelaDias: dias } });
      if ("ok" in r && r.ok) setData(r);
      else setErr("error" in r ? r.error : "Falha ao carregar");
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(janela);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [janela, token]);

  return (
    <section className="rounded-xl border border-border/50 bg-gradient-to-br from-slate-900/60 to-black/60 p-4 space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white">📊 ROAS por Criativo</h3>
          <p className="text-[11px] text-white/50">
            Receita real (pedidos pagos) agrupada por UTM. Compare com o gasto do anúncio pra saber o retorno.
          </p>
        </div>
        <div className="flex gap-1">
          {JANELAS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={janela === d ? "default" : "outline"}
              onClick={() => setJanela(d)}
              className="h-7 px-2 text-xs"
            >
              {d}d
            </Button>
          ))}
        </div>
      </header>

      {loading && <div className="text-xs text-white/60">Carregando…</div>}
      {err && <div className="text-xs text-red-400">Erro: {err}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg bg-black/30 p-2">
              <div className="text-[10px] uppercase text-white/50">Pedidos ({data.janelaDias}d)</div>
              <div className="text-xl font-bold text-white tabular-nums">{data.totalPedidos}</div>
            </div>
            <div className="rounded-lg bg-black/30 p-2">
              <div className="text-[10px] uppercase text-white/50">Receita bruta</div>
              <div className="text-xl font-bold text-green-300 tabular-nums">{fmtBrl(data.totalReceitaBrl)}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Table title="Por criativo" rows={data.porCriativo} hint="utm_content" />
            <Table title="Por campanha" rows={data.porCampanha} hint="utm_campaign" />
            <Table title="Por fonte" rows={data.porFonte} hint="utm_source" />
          </div>

          <p className="text-[10px] text-white/40 pt-1">
            Cálculo de ROAS: divida a <b>Receita</b> pelo gasto do anúncio na mesma janela. ROAS &gt; 3 = escalar. ROAS &lt; 1 = matar.
          </p>
        </>
      )}
    </section>
  );
}
