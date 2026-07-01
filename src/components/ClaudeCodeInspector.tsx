import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getClaudeInspect, simulateProviderUnstable, clearProviderUnstableFn } from "@/lib/claude-inspect.functions";

type Data = Awaited<ReturnType<typeof getClaudeInspect>>;

export function ClaudeCodeInspector() {
  const fn = useServerFn(getClaudeInspect);
  const simFn = useServerFn(simulateProviderUnstable);
  const clearFn = useServerFn(clearProviderUnstableFn);
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

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

  const runSim = async (slug: string) => {
    setBusy(slug);
    try {
      const r: any = await simFn({ data: { slug, minutes: 5 } });
      setFlash(`🧪 Pane injetada em ${slug} até ${new Date(r.until).toLocaleTimeString("pt-BR")}`);
    } catch (e: any) {
      setFlash(`⛔ ${e?.message ?? e}`);
    } finally { setBusy(null); }
  };
  const runClear = async (slug: string) => {
    setBusy(`clear:${slug}`);
    try {
      await clearFn({ data: { slug } });
      setFlash(`✅ Pane revertida em ${slug}`);
    } catch (e: any) {
      setFlash(`⛔ ${e?.message ?? e}`);
    } finally { setBusy(null); }
  };

  return (
    <section className="rounded-lg border border-cyan-500/40 bg-black/60 p-4 space-y-4 font-mono text-xs text-cyan-100">
      <header className="flex items-center justify-between border-b border-cyan-500/30 pb-2">
        <h2 className="text-sm font-bold text-cyan-300">🔬 INSPEÇÃO DE CÓDIGO & AUDITORIA SEGUNDO A SEGUNDO</h2>
        <span className="text-[10px] text-cyan-400/70">Claude Code Mirror · v111 · {data?.ts?.slice(11, 19) ?? "..."}</span>
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
        {data && (data.catalog.withSmmpanel < data.catalog.total || data.catalog.withVerified < data.catalog.total) && (
          <div className="mb-2 rounded border border-yellow-500/60 bg-yellow-500/10 px-2 py-1.5 text-yellow-200 text-[11px] shadow-[0_0_10px_rgba(234,179,8,0.35)] animate-pulse">
            ⚠️ Rotas de Failover Ocultas Desarmadas (Mapeie os IDs correspondentes no catálogo para ativar o Smart Cost Routing)
          </div>
        )}
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

      {/* v110 — Simulador de Resiliência */}
      <div className="rounded border border-fuchsia-500/40 bg-fuchsia-500/5 p-3">
        <div className="text-fuchsia-300 font-bold mb-2">🧪 SIMULADOR DE RESILIÊNCIA DE REDE (v110)</div>
        <div className="text-fuchsia-100/70 mb-2">
          Injeta pane de 5 min no fornecedor. O <code>mp-webhook.ts</code> desvia síncronamente para o backup usando os IDs triplos da v85.
        </div>
        <div className="flex flex-wrap gap-2">
          {["smmhype", "smmpainel", "verified"].map((slug) => (
            <div key={slug} className="flex gap-1">
              <button
                onClick={() => runSim(slug)}
                disabled={busy !== null}
                className="px-3 py-1 rounded bg-fuchsia-600/80 hover:bg-fuchsia-500 text-white font-bold disabled:opacity-40"
              >
                {busy === slug ? "…" : `Simular Instabilidade ${slug}`}
              </button>
              <button
                onClick={() => runClear(slug)}
                disabled={busy !== null}
                className="px-2 py-1 rounded border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-40"
                title="Reverter pane"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {flash && <div className="mt-2 text-fuchsia-200">{flash}</div>}
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
                const act = l.action ?? l.acao;
                const det = l.detail ?? l.detalhe;
                const color =
                  act === "DISPATCH_OK" ? "text-emerald-400" :
                  act === "FAILOVER_ACTIVE" ? "text-emerald-300" :
                  act === "SIMULATE_UNSTABLE" ? "text-fuchsia-300" :
                  act === "REFUND_OK" ? "text-yellow-400" :
                  act === "MARGIN_HOLD" || act === "MARGIN_HOLD_ERROR" ? "text-orange-400" :
                  act === "LATE_PAYMENT_CATCH" ? "text-cyan-400" :
                  "text-red-400";
                const text = typeof det === "string"
                  ? det
                  : (det?.message ?? JSON.stringify(det));
                return (
                  <div key={l.id} className="flex gap-2 border-b border-cyan-500/10 pb-1">
                    <span className="text-cyan-100/50">{new Date(l.created_at).toLocaleTimeString("pt-BR")}</span>
                    <span className={`${color} font-bold whitespace-nowrap`}>{act}</span>
                    <span className="truncate text-cyan-100/80">{text}</span>
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
