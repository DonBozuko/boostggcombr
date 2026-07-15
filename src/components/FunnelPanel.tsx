import { useEffect, useState } from "react";
import { getFunnelDaily } from "@/lib/admin.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Totals = { visits: number; pix_criados: number; pix_pagos: number; faturamento: number };
type Daily = { day: string; visits: number; pix_criados: number; pix_pagos: number; faturamento: number };
type ByNet = { rede: string; pix_criados: number; pix_pagos: number; faturamento: number };
type ByUtm = { source: string; visits: number };

type Data = { totals: Totals; daily: Daily[]; byNetwork: ByNet[]; byUtm: ByUtm[] };

function pct(a: number, b: number) {
  if (!b) return "0,0%";
  return `${((a / b) * 100).toFixed(1).replace(".", ",")}%`;
}
function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FunnelPanel({ token }: { token: string }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!token) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await getFunnelDaily({ data: { token, days } });
      if (!res.ok) { setErr(res.error ?? "erro"); return; }
      setData({ totals: res.totals, daily: res.daily, byNetwork: res.byNetwork, byUtm: res.byUtm });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days, token]);

  if (!token) return null;

  return (
    <Card className="p-4 md:p-6 border-amber-500/30 bg-gradient-to-br from-black/60 to-neutral-950/60">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-400/80">Growth · Etapa 1</div>
          <h3 className="text-lg font-bold text-white">Funil de Conversão</h3>
          <p className="text-xs text-neutral-400">Visitas → Pix gerado → Pix pago</p>
        </div>
        <div className="flex gap-2 items-center">
          <Button size="sm" variant={days === 7 ? "default" : "outline"} onClick={() => setDays(7)}>7d</Button>
          <Button size="sm" variant={days === 30 ? "default" : "outline"} onClick={() => setDays(30)}>30d</Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? "…" : "Atualizar"}</Button>
        </div>
      </div>

      {err && <div className="text-sm text-red-400 mb-3">Erro: {err}</div>}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Metric label="Visitas" value={data.totals.visits.toLocaleString("pt-BR")} sub="rastreadas" />
            <Metric
              label="Pix gerado"
              value={data.totals.pix_criados.toLocaleString("pt-BR")}
              sub={`${pct(data.totals.pix_criados, data.totals.visits)} das visitas`}
            />
            <Metric
              label="Pix pago"
              value={data.totals.pix_pagos.toLocaleString("pt-BR")}
              sub={`${pct(data.totals.pix_pagos, data.totals.pix_criados)} pagou`}
            />
            <Metric label="Faturamento" value={brl(data.totals.faturamento)} sub={`${days}d`} highlight />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Por rede</div>
              <div className="space-y-1">
                {data.byNetwork.length === 0 && <div className="text-xs text-neutral-500">sem dados</div>}
                {data.byNetwork.map((r) => (
                  <div key={r.rede} className="flex justify-between text-sm border-b border-white/5 py-1">
                    <span className="capitalize text-white">{r.rede}</span>
                    <span className="text-neutral-300">
                      {r.pix_pagos}/{r.pix_criados} · <span className="text-amber-400">{brl(r.faturamento)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Top origens de tráfego</div>
              <div className="space-y-1">
                {data.byUtm.length === 0 && <div className="text-xs text-neutral-500">sem dados</div>}
                {data.byUtm.map((r) => (
                  <div key={r.source} className="flex justify-between text-sm border-b border-white/5 py-1">
                    <span className="text-white">{r.source}</span>
                    <span className="text-neutral-300">{r.visits.toLocaleString("pt-BR")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.daily.length > 0 && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Diário</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="text-neutral-500">
                    <tr>
                      <th className="text-left p-1">Dia</th>
                      <th className="text-right p-1">Visitas</th>
                      <th className="text-right p-1">Pix</th>
                      <th className="text-right p-1">Pagos</th>
                      <th className="text-right p-1">Conv.</th>
                      <th className="text-right p-1">R$</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.slice(-days).map((d) => (
                      <tr key={d.day} className="border-t border-white/5">
                        <td className="p-1 text-neutral-300">{d.day}</td>
                        <td className="p-1 text-right text-white">{d.visits}</td>
                        <td className="p-1 text-right text-white">{d.pix_criados}</td>
                        <td className="p-1 text-right text-white">{d.pix_pagos}</td>
                        <td className="p-1 text-right text-amber-400">{pct(d.pix_pagos, d.visits)}</td>
                        <td className="p-1 text-right text-emerald-400">{brl(d.faturamento)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-amber-500/50 bg-amber-500/5" : "border-white/10 bg-white/5"}`}>
      <div className="text-[10px] uppercase tracking-widest text-neutral-400">{label}</div>
      <div className={`text-xl font-extrabold ${highlight ? "text-amber-400" : "text-white"}`}>{value}</div>
      {sub && <div className="text-[10px] text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}
