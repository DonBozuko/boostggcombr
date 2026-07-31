import { getAdminToken } from "@/lib/admin-token-store";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { runJarvisLieDetector } from "@/lib/jarvis-detector-mentiras.functions";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";

type Report = Awaited<ReturnType<typeof runJarvisLieDetector>>;

export function JarvisDetectorMentiras() {
  const run = useServerFn(runJarvisLieDetector);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const onRun = async () => {
    setLoading(true);
    setErro(null);
    try {
      const token = getAdminToken();
      // v385: token vazio/expirado fazia o botão "não fazer nada" (erro engolido).
      if (!token || token.length < 8) {
        setErro("Sessão do painel expirou. Recarregue a página e entre de novo.");
        return;
      }
      const r = await run({ data: { token } });
      setReport(r);
    } catch (e) {
      console.error(e);
      setErro("Não deu para auditar agora. Tente de novo em alguns segundos.");
    } finally {
      setLoading(false);
    }
  };


  const blocked = report?.blockDeploy;

  return (
    <div className="rounded-xl border border-red-500/40 bg-black/60 p-4 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-red-400 tracking-wider flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            JARVIS DETECTOR DE MENTIRAS v49
          </h3>
          <p className="text-xs text-white/60">
            Audita o que foi prometido vs o que está realmente em produção.
          </p>
        </div>
        <Button
          size="sm"
          variant="destructive"
          onClick={onRun}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Auditar agora"}
        </Button>
      </div>

      {erro && (
        <div className="mt-3 rounded-md border border-amber-500/50 bg-amber-900/30 p-2 text-xs text-amber-200">
          {erro}
        </div>
      )}



      {report && (
        <div className="mt-4 space-y-2">
          <div
            className={`rounded-md p-2 text-xs font-mono ${
              blocked
                ? "bg-red-900/40 text-red-300 border border-red-500/60 animate-pulse"
                : "bg-emerald-900/30 text-emerald-300 border border-emerald-500/40"
            }`}
          >
            {blocked
              ? `🔴 ALERTA VERMELHO — DEPLOY BLOQUEADO (${report.passed}/${report.total})`
              : `✅ INTEGRIDADE OK ${report.passed}/${report.total} • ${report.version}`}
          </div>
          <ul className="space-y-1">
            {report.checks.map((c) => (
              <li
                key={c.id}
                className="flex items-start gap-2 text-xs text-white/80"
              >
                {c.ok ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5" />
                )}
                <span className="font-medium">{c.label}</span>
                <span className="text-white/40">— {c.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
