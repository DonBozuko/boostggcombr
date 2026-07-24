import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runOpsAuditNow } from "@/lib/ops-audit.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// v233 — Auditoria Forense sob demanda. Mostra exatamente o que o robô horário vê.
export default function OpsAuditPanel() {
  const run = useServerFn(runOpsAuditNow);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);

  async function executar() {
    const token = window.prompt("Cole o ADMIN_TOKEN:");
    if (!token) return;
    setLoading(true);
    setErro(null);
    try {
      const res: any = await run({ data: { token } });
      if (!res.ok) {
        setErro(res.error === "UNAUTHORIZED" ? "Token inválido." : "Falha na auditoria.");
        setReport(null);
      } else {
        setReport(res.report);
      }
    } catch (e: any) {
      setErro(e?.message ?? "Falha inesperada.");
    } finally {
      setLoading(false);
    }
  }

  const criticos = (report?.findings ?? []).filter((f: any) => f.severity === "critical");
  const avisos = (report?.findings ?? []).filter((f: any) => f.severity === "warning");

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-bold">🔎 Auditoria Forense</h3>
          <p className="text-sm text-muted-foreground">
            Confere o resultado real: robôs, entregas, caixa, e-mails e Pix parado.
          </p>
        </div>
        <Button onClick={executar} disabled={loading}>
          {loading ? "Auditando..." : "Rodar auditoria agora"}
        </Button>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {report && (
        <div className="space-y-3">
          <div
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              criticos.length === 0
                ? "bg-emerald-500/10 text-emerald-500"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {criticos.length === 0
              ? "✅ Nada crítico. Nenhum cliente ou dinheiro afetado agora."
              : `🚨 ${criticos.length} problema(s) afetando cliente ou dinheiro`}
          </div>

          {[...criticos, ...avisos].map((f: any) => (
            <div
              key={f.code}
              className={`rounded-md border p-3 text-sm ${
                f.severity === "critical" ? "border-destructive/40" : "border-border"
              }`}
            >
              <p className="font-semibold">
                {f.severity === "critical" ? "🚨" : "⚠️"} {f.titulo}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">PROBLEMA:</span> {f.problema}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">O QUE FAZER:</span> {f.o_que_fazer}
              </p>
            </div>
          ))}

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Ver evidência técnica completa</summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded bg-muted p-2">
              {JSON.stringify(report.snapshot, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </Card>
  );
}
