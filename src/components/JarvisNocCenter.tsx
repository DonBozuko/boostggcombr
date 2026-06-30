import { useEffect, useState, useTransition } from "react";
import { useServerFn } from "@tanstack/react-start";
import { jarvisNocSnapshot, jarvisChat, jarvisFailoverAtivo, type NocSnapshot, type JarvisChatResp } from "@/lib/jarvis-noc.functions";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ChatMsg = { role: "user" | "jarvis"; text: string };

export function JarvisNocCenter({ token, refreshSignal = 0 }: { token: string; refreshSignal?: number }) {
  const snapFn = useServerFn(jarvisNocSnapshot);
  const chatFn = useServerFn(jarvisChat);
  const failoverFn = useServerFn(jarvisFailoverAtivo);
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
      const res: JarvisChatResp = await chatFn({ data: { token, question: text } });
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

  const runFailover = async () => {
    try {
      const res = await failoverFn({ data: { token } });
      if ((res as any).ok) toast.success(`Failover: ${(res as any).action} ${(res as any).to ? "→ " + (res as any).to : ""}`);
      else toast.error((res as any).error ?? "Falha");
      refresh();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  };

  if (!snap || !snap.ok) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-black/60 p-4 text-red-200 text-sm font-mono">
        🛰️ Carregando Central NOC J.A.R.V.I.S....
      </div>
    );
  }

  const healthPct = Math.round((snap.systemHealth.ok / snap.systemHealth.total) * 100);
  const healthColor = healthPct === 100 ? "text-emerald-400 border-emerald-500/60" : healthPct >= 80 ? "text-amber-300 border-amber-500/60" : "text-red-400 border-red-500/60";

  return (
    <div className="rounded-2xl border-2 border-red-500/60 bg-gradient-to-br from-black via-red-950/30 to-black backdrop-blur-xl p-4 shadow-[0_0_40px_rgba(255,0,40,0.35)] space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-red-300 font-black text-lg tracking-widest uppercase">🛰️ J.A.R.V.I.S. NOC</div>
          <div className="text-[10px] text-red-200/70 font-mono">Central de Inteligência Operacional · Autonomia com Segurança</div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading} className="border-red-500/50 text-red-200">
            {loading ? "..." : "🔄 Refresh"}
          </Button>
          <Button size="sm" onClick={runFailover} className="bg-red-600 hover:bg-red-500 text-white text-xs">
            ⚡ Failover Check
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className={`rounded-lg border-2 ${healthColor} bg-black/50 p-3`}>
          <div className="text-[10px] uppercase opacity-70">Saúde do Sistema</div>
          <div className="text-2xl font-black font-mono">{snap.systemHealth.ok}/{snap.systemHealth.total} OK</div>
        </div>
        <div className="rounded-lg border border-cyan-500/50 bg-black/50 p-3 text-cyan-200">
          <div className="text-[10px] uppercase opacity-70">Pedidos 24h</div>
          <div className="text-2xl font-black font-mono">{snap.pedidos.total24h}</div>
          <div className="text-[10px] font-mono">✅ {snap.pedidos.pagos24h} pagos · ⏳ {snap.pedidos.pendentes24h} pend.</div>
        </div>
        <div className="rounded-lg border border-amber-500/50 bg-black/50 p-3 text-amber-200 col-span-2">
          <div className="text-[10px] uppercase opacity-70">Latência APIs (ms)</div>
          <div className="flex gap-3 font-mono text-xs mt-1">
            {snap.apiLatency.map((a) => (
              <span key={a.name} className={a.ok ? "text-emerald-300" : "text-red-300"}>
                {a.ok ? "●" : "✕"} {a.name}: {a.ms}ms
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-red-200/80 font-bold mb-1">Fornecedores</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {snap.fornecedores.map((f) => (
            <div key={f.id} className={`rounded-lg border p-2 text-xs font-mono ${f.ativo ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-100" : "border-white/10 bg-black/40 text-white/70"}`}>
              <div className="flex justify-between font-bold">
                <span>{f.nome}</span>
                <span>{f.ativo ? "🟢 ATIVO" : "⚫"}</span>
              </div>
              <div>Saldo: {f.saldo != null ? `R$ ${Number(f.saldo).toFixed(2)}` : "aguardando leitura"}</div>
              <div>Falhas: {f.falhas ?? 0} · Status: {f.status ?? "sincronizando"}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-red-500/40 bg-black/70 p-3 space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-red-300 font-bold">💬 Pergunte ao J.A.R.V.I.S.</div>
        <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
          {chat.length === 0 && (
            <div className="text-white/50 italic">Ex: "Quanto vendi hoje?" · "Qual API está lenta?" · "O que precisa da minha atenção?"</div>
          )}
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
            placeholder="Pergunte algo em linguagem natural..."
            className="flex-1 bg-black/60 border border-red-500/50 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-400"
          />
          <Button type="submit" disabled={thinking || !q.trim()} className="bg-red-600 hover:bg-red-500 text-white">
            Enviar
          </Button>
        </form>
      </div>

      {pendingCritical && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setPendingCritical(null)}>
          <div onClick={(e) => e.stopPropagation()} className="max-w-md w-full mx-4 rounded-2xl border-2 border-red-500 bg-gradient-to-br from-red-950 to-black p-6 shadow-[0_0_60px_rgba(255,0,40,0.7)] animate-pulse">
            <div className="text-red-400 font-black text-xl uppercase tracking-wider">⚠️ AÇÃO CRÍTICA BLOQUEADA</div>
            <p className="text-red-100 text-sm mt-3">{pendingCritical.reason}</p>
            <p className="text-white/90 text-xs mt-2 font-mono bg-black/50 p-2 rounded border border-red-500/30">"{pendingCritical.question}"</p>
            <p className="text-red-200/80 text-xs mt-3">
              J.A.R.V.I.S. está terminantemente bloqueado para executar esta ação. Requer confirmação manual do Diretor Fabiano.
            </p>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => setPendingCritical(null)} variant="outline" className="flex-1 border-white/30 text-white">
                Cancelar
              </Button>
              <Button onClick={() => { toast.warning("Ação registrada para revisão manual."); setPendingCritical(null); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold">
                ✋ CONFIRMAR MANUALMENTE
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
