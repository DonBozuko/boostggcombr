// v375 — Painel "Trilha Forense de Despacho".
// Mostra a resposta BRUTA do fornecedor em cada tentativa de envio.
// Só leitura: nenhum botão aqui reenvia ou altera pedido.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { getDispatchLogs, type DispatchLogRow } from "@/lib/dispatch-log.functions";
import { Loader2, ScrollText, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function DispatchForensicsPanel({ token }: { token: string }) {
  const load = useServerFn(getDispatchLogs);
  const [rows, setRows] = useState<DispatchLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyFail, setOnlyFail] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const r = await load({ data: { token, onlyFail, limit: 60 } });
      if (!r.ok) { toast.error("Acesso negado"); return; }
      setRows(r.rows as DispatchLogRow[]);
    } catch (e) {
      toast.error(`Erro ao ler trilha: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [load, token, onlyFail]);

  useEffect(() => { void fetchRows(); }, [fetchRows]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Trilha forense de despacho</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={onlyFail ? "default" : "outline"} onClick={() => setOnlyFail((v) => !v)}>
            {onlyFail ? "Só falhas" : "Tudo"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void fetchRows()} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Atualizar"}
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        Cada linha é uma tentativa real de envio ao fornecedor, com a resposta crua que ele devolveu.
      </p>

      {rows.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground">Nenhuma tentativa registrada com esse filtro.</p>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-border/60 bg-background/40 p-2 text-xs">
            <button
              type="button"
              className="w-full text-left flex flex-wrap items-center gap-2"
              onClick={() => setOpen(open === r.id ? null : r.id)}
            >
              {r.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                : <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
              <span className="text-muted-foreground">{fmt(r.created_at)}</span>
              <span className="font-medium">{r.provider_slug}</span>
              <span className="text-muted-foreground">{r.pacote ?? "—"}</span>
              <span className="text-muted-foreground">id {r.service_id ?? "—"}</span>
              <span className="text-muted-foreground">qtd {r.quantidade ?? "—"}</span>
              {r.http_status != null && <span className="text-muted-foreground">HTTP {r.http_status}</span>}
              {r.attempt != null && r.attempt > 1 && <span className="text-amber-500">tentativa {r.attempt}</span>}
              {r.order_id && <span className="text-emerald-500">pedido no fornecedor {r.order_id}</span>}
            </button>

            {!r.ok && r.error_text && (
              <p className="mt-1 text-destructive break-words">{r.error_text}</p>
            )}

            {open === r.id && (
              <div className="mt-2 space-y-1">
                {r.target_link && (
                  <p className="text-muted-foreground break-all">Alvo enviado: {r.target_link}</p>
                )}
                {r.pedido_id && (
                  <p className="text-muted-foreground break-all">Pedido interno: {r.pedido_id}</p>
                )}
                <pre className="max-h-64 overflow-auto rounded bg-muted/50 p-2 whitespace-pre-wrap break-all text-[11px]">
                  {r.raw_response ?? "(sem corpo — falha de rede antes da resposta)"}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default DispatchForensicsPanel;
