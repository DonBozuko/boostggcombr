import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listSimulatablePackages, simulatePurchase } from "@/lib/simulate-purchase.functions";
import { CheckCircle2, XCircle, Loader2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

type Row = { pacote: string; category: string; quantidade: number; cost_brl: number; price_brl: number };
type Step = { key: string; ok: boolean; ms: number; detail: string };

export function SimulateCheckoutPanel({ token }: { token: string }) {
  const list = useServerFn(listSimulatablePackages);
  const sim = useServerFn(simulatePurchase);
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState<string>("");
  const [pacote, setPacote] = useState<string>("");
  const [qty, setQty] = useState<number>(0);
  const [handle, setHandle] = useState<string>("@fabiano.majestic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ steps: Step[]; pedidoId: string | null; totalMs?: number; finalStatus?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const r = await list({ data: { token } });
      if (r.ok) setRows(r.rows as Row[]);
    })().catch(() => {});
  }, [list, token]);

  const categories = Array.from(new Set(rows.map((r) => r.category))).sort();
  const pacotes = Array.from(new Set(rows.filter((r) => r.category === category).map((r) => r.pacote))).sort();
  const qtys = rows.filter((r) => r.pacote === pacote).map((r) => ({ q: r.quantidade, price: r.price_brl, cost: r.cost_brl }));

  const run = async () => {
    if (!pacote || !qty || !handle) {
      toast.error("Preencha pacote, quantidade e handle");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const r = await sim({ data: { token, pacote, quantidade: qty, handle } });
      if (!r.ok) {
        toast.error(`Falha: ${(r as any).error ?? "desconhecido"}`);
        return;
      }
      setResult({ steps: r.steps, pedidoId: r.pedidoId, totalMs: (r as any).totalMs, finalStatus: (r as any).finalStatus });
      toast.success(`Simulação concluída em ${(r as any).totalMs}ms`);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/40 bg-black/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 mb-3">
        <FlaskConical className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-bold text-amber-400 tracking-wider">SIMULADOR DE COMPRA REAL</h3>
      </div>
      <p className="text-xs text-white/60 mb-3">
        Reproduz o pipeline (pricing → pedido SIM → smart-routing → cálculo de margem → Telegram) em modo
        <span className="text-amber-300"> dry-run</span>. Nenhum saldo é debitado, nenhum pedido é enviado ao fornecedor,
        nenhum valor é movimentado. Fluxo real de compra permanece intocado.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
        <select
          className="bg-black/60 border border-white/20 rounded-md px-2 py-1.5 text-xs text-white"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPacote(""); setQty(0); }}
        >
          <option value="">— Rede/Categoria —</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="bg-black/60 border border-white/20 rounded-md px-2 py-1.5 text-xs text-white"
          value={pacote}
          onChange={(e) => { setPacote(e.target.value); setQty(0); }}
          disabled={!category}
        >
          <option value="">— Pacote —</option>
          {pacotes.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          className="bg-black/60 border border-white/20 rounded-md px-2 py-1.5 text-xs text-white"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          disabled={!pacote}
        >
          <option value={0}>— Quantidade —</option>
          {qtys.map((q) => (
            <option key={q.q} value={q.q}>
              {q.q.toLocaleString("pt-BR")} un · R${q.price.toFixed(2)} (custo R${q.cost.toFixed(4)})
            </option>
          ))}
        </select>
        <Input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@handle_teste"
          className="text-xs h-8"
        />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <label className="flex items-center gap-1.5 text-xs text-white/80 cursor-pointer">
          <input type="radio" checked={mode === "dry"} onChange={() => setMode("dry")} />
          Dry-run (não envia)
        </label>
        <label className="flex items-center gap-1.5 text-xs text-red-300 cursor-pointer">
          <input type="radio" checked={mode === "real"} onChange={() => setMode("real")} />
          Real (envia ao fornecedor)
        </label>
        <Button size="sm" variant="default" className="ml-auto bg-amber-600 hover:bg-amber-500" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "🧪 Simular Compra"}
        </Button>
      </div>

      {result && (
        <div className="border-t border-white/10 pt-3 space-y-1">
          <div className="text-xs text-white/60 mb-2">
            Pedido: <span className="font-mono text-amber-300">{result.pedidoId?.slice(0, 8)}</span> ·{" "}
            Status final: <span className="text-emerald-300">{result.finalStatus}</span> ·{" "}
            {result.totalMs}ms total
          </div>
          {result.steps.map((s) => (
            <div key={s.key} className="flex items-start gap-2 text-xs">
              {s.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5" />
                : <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5" />}
              <span className="font-mono text-white/80 w-40 shrink-0">{s.key}</span>
              <span className="text-white/50 w-14 shrink-0">{s.ms}ms</span>
              <span className={s.ok ? "text-white/70" : "text-red-300"}>{s.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
