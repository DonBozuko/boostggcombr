import { useEffect, useState, useTransition } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { jarvisNocSnapshot, jarvisChat, jarvisFailoverAtivo, type NocSnapshot, type JarvisChatResp } from "@/lib/jarvis-noc.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ChatMsg = { role: "user" | "jarvis"; text: string };

export function JarvisNocCenter({ token, refreshSignal = 0 }: { token: string; refreshSignal?: number }) {
  const snapFn = useServerFn(jarvisNocSnapshot);
  const chatFn = useServerFn(jarvisChat);
  const failoverFn = useServerFn(jarvisFailoverAtivo);
  const router = useRouter();
  const [snap, setSnap] = useState<NocSnapshot | null>(null);
  const [loading, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [pendingCritical, setPendingCritical] = useState<{ reason: string; question: string } | null>(null);
  const [thinking, setThinking] = useState(false);

  const refresh = () => {
    startTransition(() => {
      snapFn({ data: { token } }).then(setSnap).catch(() => {});
    });
  };

  useEffect(() => { refresh(); const i = setInterval(refresh, 30_000); return () => clearInterval(i); }, [token]);
  useEffect(() => { if (refreshSignal > 0) refresh(); }, [refreshSignal]);

  const ask = async (text: string) => {
    if (!text.trim()) return;
    setChat((c) => [...c, { role: "user", text }]);
    setQ("");
    setThinking(true);
    try {
      const res = await chatFn({ data: { token, question: text } }) as JarvisChatResp;
      if (!res.ok) {
        setChat((c) => [...c, { role: "jarvis", text: `❌ ${res.error}` }]);
      } else if ("requiresConfirmation" in res && res.requiresConfirmation) {
        setPendingCritical({ reason: res.reason, question: res.question });
      } else {
        setChat((c) => [...c, { role: "jarvis", text: res.answer }]);
      }
    } catch (e: any) {
      setChat((c) => [...c, { role: "jarvis", text: `❌ ${e?.message ?? e}` }]);
    } finally { setThinking(false); }
  };

  const runUnifiedDiagnostic = async () => {
    const t = toast.loading("🔄 Diagnóstico Truth v653...");
    try {
      const [snapRes, failRes] = await Promise.all([
        snapFn({ data: { token } }),
        failoverFn({ data: { token } }),
      ]);
      setSnap(snapRes);
      await router.invalidate();
      const fr: any = failRes;
      if (fr?.ok) toast.success(`Sincronizado · Truth v653 Active`, { id: t });
      else toast.success("Sincronização concluída", { id: t });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na sincronização", { id: t });
    }
  };

  if (!snap || !snap.ok) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-black/60 p-4 text-red-200 text-sm font-mono animate-pulse">
        🛰️ Jarvis Truth Protocol v653 Syncing...
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    GREEN: "text-emerald-400 border-emerald-500/60",
    DEGRADED: "text-amber-300 border-amber-500/60",
    RED: "text-red-400 border-red-500/60",
    UNKNOWN: "text-zinc-400 border-zinc-500/60"
  };

  const healthColor = statusColors[snap.globalStatus] || statusColors.UNKNOWN;

  return (
    <div className="rounded-2xl border-2 border-red-500/60 bg-gradient-to-br from-black via-red-950/30 to-black backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(255,0,40,0.35)] space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-red-300 font-black text-lg tracking-widest uppercase">🛰️ J.A.R.V.I.S. TRUTH</div>
          <div className="text-[10px] text-red-200/70 font-mono">Protocolo de Verdade v653 · Green Exige Prova</div>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={runUnifiedDiagnostic}
            disabled={loading}
            className="bg-gradient-to-r from-red-700 via-red-500 to-red-700 hover:from-red-600 hover:to-red-600 text-white font-bold text-xs shadow-[0_0_20px_rgba(255,0,40,0.6)] border border-red-400/50"
          >
            {loading ? "🛰️ Telemetria..." : "🔄 Truth Sync"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className={`rounded-lg border-2 ${healthColor} bg-black/50 p-3`}>
          <div className="text-[10px] uppercase opacity-70">Saúde Global</div>
          <div className="text-2xl font-black font-mono">{snap.globalStatus}</div>
        </div>
        <div className="rounded-lg border border-cyan-500/50 bg-black/50 p-3 text-cyan-200">
          <div className="text-[10px] uppercase opacity-70">Vendas 24h</div>
          <div className="text-2xl font-black font-mono">{snap.pedidos.pagos24h}</div>
          <div className={`text-[9px] font-mono mt-1 ${snap.pedidos.travados > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
             {snap.pedidos.travados} TRAVADOS
          </div>
        </div>
        <div className="rounded-lg border border-amber-500/50 bg-black/50 p-3 text-amber-200 col-span-2">
          <div className="text-[10px] uppercase opacity-70">Latência Crítica (ms)</div>
          <div className="flex flex-col gap-1 font-mono text-[10px] mt-1">
            {snapshotToLatency(snap).map((a: any) => (
              <span key={a.name} className={a.ok ? "text-emerald-300" : "text-red-300"}>
                {a.ok ? "●" : "✕"} {a.name}: {a.ms}ms
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-red-200/80 font-bold mb-1">Fornecedores v653</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {snap.fornecedores.map((f: any) => (
            <div key={f.id} className={`rounded-lg border p-2 text-xs font-mono ${f.ativo ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-100" : "border-white/10 bg-black/40 text-white/70"}`}>
              <div className="flex justify-between font-bold">
                <span className="truncate max-w-[100px]">{f.nome}</span>
                <span className={f.state === 'GREEN' ? 'text-emerald-400' : f.state === 'RED' ? 'text-red-400' : 'text-amber-300'}>
                  {f.state}
                </span>
              </div>
              <div className="text-[10px] mt-1">
                Saldo: R$ {f.saldo?.toFixed(2) || "0.00"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-red-500/40 bg-black/70 p-3 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-red-300 font-bold">💬 J.A.R.V.I.S. Truth Chat</div>
        <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
          {chat.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-cyan-300" : "text-red-200"}>
              <span className="font-bold">{m.role === "user" ? "Diretor:" : "J.A.R.V.I.S.:"}</span> {m.text}
            </div>
          ))}
          {thinking && <div className="text-red-300/70 animate-pulse">J.A.R.V.I.S. processando...</div>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex gap-2">
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Pergunte sobre a verdade do sistema..."
            className="flex-1 bg-black/60 border border-red-500/50 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-400"
          />
          <Button type="submit" disabled={thinking || !q.trim()} className="bg-red-600 hover:bg-red-500 text-white">
            Ask
          </Button>
        </form>
      </div>
    </div>
  );
}

function snapshotToLatency(snap: any) {
  return snap.apiLatency || [];
}
