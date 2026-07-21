// v162 — Painel read-only de telemetria dos 3 catálogos.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCatalogTelemetry, type ProviderTelemetry } from "@/lib/catalog-telemetry.functions";

export function CatalogTelemetryPanel({ token }: { token: string }) {
  const fn = useServerFn(getCatalogTelemetry);
  const [rows, setRows] = useState<ProviderTelemetry[] | null>(null);
  const [ts, setTs] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    fn({ data: { token } })
      .then((r: any) => {
        if (r?.ok) { setRows(r.providers); setTs(r.generated_at); setErr(null); }
        else setErr(r?.error ?? "erro");
      })
      .catch((e) => setErr(e?.message ?? String(e)));
  };

  useEffect(() => { load(); const i = setInterval(load, 60_000); return () => clearInterval(i); }, [token]);

  return (
    <div className="rounded-2xl border-2 border-cyan-500/60 bg-gradient-to-br from-black via-cyan-950/20 to-black p-4 shadow-[0_0_30px_rgba(0,200,255,0.25)] space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-sm text-cyan-300">📡 TELEMETRIA DE CATÁLOGOS (READ-ONLY)</h3>
        <button onClick={load} className="text-xs text-cyan-400 hover:text-cyan-200 font-mono">↻ atualizar</button>
      </div>
      {err && <div className="text-xs text-red-300 font-mono">⚠ {err}</div>}
      {!rows && !err && <div className="text-xs text-cyan-200/70 font-mono">carregando…</div>}
      {rows && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {rows.map((p) => (
            <div key={p.slug} className={`rounded-xl border p-3 space-y-1.5 font-mono text-xs ${p.ativo ? "border-emerald-500/50 bg-emerald-950/20" : "border-zinc-600/50 bg-zinc-900/40"}`}>
              <div className="flex items-center justify-between">
                <span className="text-cyan-200 font-bold">{p.nome}</span>
                <span className={p.ativo ? "text-emerald-400" : "text-zinc-500"}>{p.ativo ? "ATIVO" : "OFF"}</span>
              </div>
              {/* v181 — saldo removido daqui: fonte única no NOC. Mantido só cotação (dado exclusivo). */}
              <div className="flex justify-between text-zinc-300"><span>Cotação USD:</span><span>R$ {p.cotacao_brl.toFixed(4)}</span></div>

              <div className="flex justify-between text-zinc-300"><span>Pacotes mapeados:</span><span className="text-cyan-300">{p.pacotes_mapeados}</span></div>
              {p.catalogo_indexado != null && (
                <div className="flex justify-between text-zinc-300"><span>Catálogo indexado:</span><span className="text-cyan-300">{p.catalogo_indexado}</span></div>
              )}
              {p.last_sync && (
                <div className="flex justify-between text-zinc-400"><span>Último sync:</span><span>{new Date(p.last_sync).toLocaleString("pt-BR")}</span></div>
              )}
              {p.slug !== "smmhype" && (
                <div className="text-zinc-500 text-[10px] pt-1 border-t border-zinc-700/50">rate consultado em runtime no despacho</div>
              )}
            </div>
          ))}
        </div>
      )}
      {ts && <div className="text-[10px] text-cyan-500/60 font-mono">snapshot: {new Date(ts).toLocaleTimeString("pt-BR")}</div>}
    </div>
  );
}
