// v363 — Painel "Onde o cliente desiste". Linguagem direta, sem jargão.
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getFunilEtapas, type FunilEtapasPayload } from "@/lib/funil-etapas.functions";

export function FunilEtapasPanel({ token }: { token: string }) {
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<FunilEtapasPayload | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      setData(await getFunilEtapas({ data: { token, days } }));
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token, days]);

  if (!token) return null;

  const etapas = data?.etapas ?? [];
  const topo = etapas[0]?.sessoes ?? 0;

  return (
    <Card className="p-4 md:p-6 border-amber-500/30 bg-gradient-to-br from-black/60 to-neutral-950/60">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-400/80">Growth · v363</div>
          <h3 className="text-lg font-bold text-white">Onde o cliente desiste</h3>
          <p className="text-xs text-neutral-400">Cada etapa da compra, medida de verdade.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={days === 7 ? "default" : "outline"} onClick={() => setDays(7)}>7d</Button>
          <Button size="sm" variant={days === 30 ? "default" : "outline"} onClick={() => setDays(30)}>30d</Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>{loading ? "…" : "Atualizar"}</Button>
        </div>
      </div>

      {data?.error && <p className="text-sm text-red-400">Erro: {data.error}</p>}

      <div className="space-y-2">
        {etapas.map((e, i) => {
          const anterior = i === 0 ? topo : etapas[i - 1].sessoes;
          const perda = anterior > 0 ? Math.max(0, anterior - e.sessoes) : 0;
          const largura = topo > 0 ? Math.max(3, (e.sessoes / topo) * 100) : 0;
          return (
            <div key={e.etapa}>
              <div className="flex justify-between text-xs text-neutral-300 mb-1">
                <span>{e.rotulo}</span>
                <span className="font-mono">
                  {e.sessoes} pessoa(s)
                  {i > 0 && perda > 0 && <span className="text-red-400"> · saíram {perda}</span>}
                </span>
              </div>
              <div className="h-3 rounded bg-neutral-800 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${largura}%` }} />
              </div>
            </div>
          );
        })}
        {etapas.every((e) => e.sessoes === 0) && !loading && (
          <p className="text-sm text-neutral-400">
            Ainda sem dados nesse período — o medidor começa a contar a partir da publicação.
          </p>
        )}
      </div>

      {!!data?.falhas_pix.length && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-red-300 mb-2">Pix que não abriu (motivo)</h4>
          <ul className="text-xs text-neutral-300 space-y-1">
            {data.falhas_pix.map((f) => (
              <li key={f.motivo} className="flex justify-between gap-3">
                <span className="truncate">{f.motivo}</span>
                <span className="font-mono text-red-300">{f.n}x</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!data?.quedas_por_pacote.length && (
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-amber-300 mb-2">Pacotes mais clicados x Pix gerado</h4>
          <ul className="text-xs text-neutral-300 space-y-1">
            {data.quedas_por_pacote.map((p) => (
              <li key={p.plan_id} className="flex justify-between gap-3">
                <span className="font-mono">{p.plan_id}</span>
                <span className="font-mono">
                  {p.escolhas} clique(s) → {p.pix} Pix
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
