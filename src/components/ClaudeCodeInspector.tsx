import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getClaudeInspect } from "@/lib/claude-inspect.functions";

type Data = Awaited<ReturnType<typeof getClaudeInspect>>;

export function ClaudeCodeInspector() {
  const fn = useServerFn(getClaudeInspect);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fn();
        if (alive) { setData(r as Data); setErr(null); }
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(iv); };
  }, [fn]);

  return (
    <section className="rounded-lg border border-cyan-500/40 bg-black/60 p-4 space-y-4 font-mono text-xs text-cyan-100">
      <header className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
        <h2 className="text-sm font-bold text-cyan-300">🔬 INSPEÇÃO DE CÓDIGO & AUDITORIA SEGUNDO A SEGUNDO</h2>
        <span className="text-[10px] text-cyan-400/70">Claude Code Mirror · v108 · {data?.ts?.slice(11, 19) ?? "..."}</span>
      </header>

      {err && <div className="text-red-400">⛔ {err}</div>}

      {/* Panel 1 — Formula */}
      <div className="rounded border border-cyan-500/20 p-3">
        <div className="text-cyan-300 font-bold mb-1">Painel 1 · margin-guardian.ts (runtime)</div>
        {data ? (
          <>
            <div className="text-emerald-300 text-sm">{data.formula.raw}</div>
            <div className="mt-1 text-cyan-100/80">
              PROFIT_MULT={data.formula.PROFIT_MULT} · COUPON_BUFFER={data.formula.COUPON_BUFFER} · PIX_NET={data.formula.PIX_NET}
            </div>
            <div>
              Margem mínima 300%:{" "}
              <span className={data.formula.marginActive ? "text-emerald-400" : "text-red-400"}>
                {data.formula.marginActive ? "🟢 ATIVA" : "🔴 INATIVA"}
              </span>{" "}· ratio ≥ {data.formula.MIN_NET_PROFIT_RATIO.toFixed(1)}
            </div>
            <div className="mt-1 text-cyan-100/70">
              Amostra: custo R$ {data.formula.sample.costBrl.toFixed(2)} → preço R$ {data.formula.sample.priceBrl.toFixed(2)} · lucro líquido R$ {data.formula.sample.netProfitBrl.toFixed(4)}
            </div>
          </>
        ) : <div>carregando…</div>}
      </div>

      {/* Panel 2 — Canonical count */}
      <div className="rounded border border-cyan-500/20 p-3">
        <div className="text-cyan-300 font-bold mb-1">Painel 2 · pricing_items (contador canônico)</div>
        {data ? (
          <div className="grid grid-cols-2 gap-2">
            <div>
              Total:{" "}
              <span className={data.catalog.symmetric ? "text-emerald-400" : "text-yellow-400"}>
                {data.catalog.total} / {data.catalog.expected}
              </span>{" "}
              {data.catalog.symmetric ? "🟢 simétrico" : "⚠️ divergente"}
            </div>
            <div>Triple-ID: <span className="text-emerald-300">{data.catalog.withTriple}</span></div>
            <div>SMMhype IDs: {data.catalog.withSmmhype}</div>
            <div>SMMPainel IDs: {data.catalog.withSmmpanel}</div>
            <div>Verified IDs: {data.catalog.withVerified}</div>
          </div>
        ) : <div>carregando…</div>}
      </div>

      {/* Panel 3 — Webhook logs */}
      <div className="rounded border border-cyan-500/20 p-3">
        <div className="text-cyan-300 font-bold mb-1">Painel 3 · mp-webhook.ts (log real)</div>
        {data ? (
          data.logs.length === 0 ? (
            <div className="text-cyan-100/60">sem eventos recentes</div>
          ) : (
            <div className="max-h-64 overflow-auto space-y-1">
              {data.logs.map((l: any) => {
                const color =
                  l.acao === "DISPATCH_OK" ? "text-emerald-400" :
                  l.acao === "REFUND_OK" ? "text-yellow-400" :
                  l.acao === "MARGIN_HOLD" ? "text-orange-400" :
                  l.acao === "LATE_PAYMENT_CATCH" ? "text-cyan-400" :
                  "text-red-400";
                return (
                  <div key={l.id} className="flex gap-2 border-b border-cyan-500/10 pb-1">
                    <span className="text-cyan-100/50">{new Date(l.created_at).toLocaleTimeString("pt-BR")}</span>
                    <span className={`${color} font-bold`}>{l.acao}</span>
                    <span className="truncate text-cyan-100/70">{typeof l.detalhe === "string" ? l.detalhe : JSON.stringify(l.detalhe)}</span>
                  </div>
                );
              })}
            </div>
          )
        ) : <div>carregando…</div>}
      </div>
    </section>
  );
}
