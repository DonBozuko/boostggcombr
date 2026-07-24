import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runProbeCancel } from "@/lib/probe-cancel.functions";

export function ProbeCancelButton() {
  const run = useServerFn(runProbeCancel);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const go = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await run();
      setResult(r);
    } catch (e: any) {
      setResult({ ok: false, error: e?.message ?? "erro" });
    } finally {
      setLoading(false);
    }
  };

  const label = (s: boolean | "unknown") =>
    s === true ? "✅ SUPORTA" : s === false ? "❌ NÃO SUPORTA" : "❓ INDETERMINADO";

  return (
    <div className="mt-3 rounded-xl border border-amber-500/30 bg-black/60 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <div className="text-sm font-bold text-amber-300">🧪 Probe: cancelamento nos fornecedores</div>
          <div className="text-[11px] text-amber-200/70">Testa se SMMHype / SMMPainel / Verified aceitam <code>action=cancel</code>. Zero risco (ordem 0).</div>
        </div>
        <button
          onClick={go}
          disabled={loading}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-black text-sm font-bold disabled:opacity-50"
        >
          {loading ? "Rodando..." : "Rodar probe"}
        </button>
      </div>
      {result && (
        <div className="mt-2 space-y-2">
          {result.results?.map((r: any) => (
            <div key={r.slug} className="rounded border border-amber-500/20 bg-black/40 p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200">{r.slug}</span>
                <span>{label(r.supports_cancel)}</span>
              </div>
              <div className="text-amber-100/60 mt-1">HTTP {r.http} — <code className="break-all">{r.body}</code></div>
            </div>
          ))}
          {result.error && <div className="text-red-400 text-xs">{result.error}</div>}
        </div>
      )}
    </div>
  );
}
