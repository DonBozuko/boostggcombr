import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { benchBatch, benchCount } from "@/lib/bench.functions";
import { getLastBenchRun } from "@/lib/bench-autonomo.functions";
import { summarizeBench, type BenchRow } from "@/lib/bench-sweep";
import { Loader2, ShieldCheck, AlertTriangle, Bot } from "lucide-react";
import { toast } from "sonner";
import { RecargaFornecedor } from "@/components/RecargaFornecedorButton";


const LABEL: Record<string, string> = {
  entregavel: "Entrega garantida",
  saldo: "Falta saldo no fornecedor",
  catalogo: "Fornecedor não reconhece o serviço",
  margem: "Custo subiu e comeu a margem",
  sem_fornecedor: "Sem fornecedor habilitado",
};

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

export function BenchPanel({ token }: { token: string }) {
  const count = useServerFn(benchCount);
  const batch = useServerFn(benchBatch);
  const lastRun = useServerFn(getLastBenchRun);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<BenchRow[]>([]);
  const [auto, setAuto] = useState<any | null>(null);

  const loadAuto = useCallback(async () => {
    try {
      const r = await lastRun({ data: { token } });
      if (r.ok) setAuto(r.run ?? null);
    } catch { /* silencioso: painel não pode quebrar por leitura */ }
  }, [lastRun, token]);

  useEffect(() => { void loadAuto(); }, [loadAuto]);


  const run = async () => {
    setRunning(true);
    setRows([]);
    setDone(0);
    try {
      const c = await count({ data: { token } });
      if (!c.ok) {
        toast.error("Acesso negado");
        return;
      }
      setTotal(c.total);
      const acc: BenchRow[] = [];
      let offset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const r = await batch({ data: { token, offset, limit: 20 } });
        if (!r.ok) break;
        acc.push(...(r.rows as BenchRow[]));
        setRows([...acc]);
        setDone(acc.length);
        offset = r.next;
        if (r.done || r.rows.length === 0) break;
      }
      toast.success(`Bancada concluída: ${acc.length} pacotes testados`);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setRunning(false);
    }
  };

  const s = summarizeBench(rows);
  // v384 — saldo NÃO é bloqueio (v350/v352): sai da tabela de problemas e vira
  // lista de recarga agrupada por fornecedor. A tabela guarda só o que impede
  // de verdade a entrega (catálogo, margem, sem fornecedor).
  const esperandoRecarga = rows.filter((r) => r.verdict === "saldo");
  const travados = rows.filter((r) => r.verdict !== "entregavel" && r.verdict !== "saldo");
  const porSaldo: Record<string, BenchRow[]> = {};
  for (const r of esperandoRecarga) {
    const k = r.faltaEm ?? "fornecedor";
    (porSaldo[k] ??= []).push(r);
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-black/60 p-4 backdrop-blur">
      <div className="mb-1 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <h3 className="text-sm font-bold tracking-wider text-emerald-400">
          BANCADA DE PROVAS · TESTE DE TODOS OS PACOTES (SEM GASTAR)
        </h3>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Pergunta a cada pacote, em todos os fornecedores: “se um cliente pagasse este agora, sairia?”.
        Usa a mesma decisão do checkout, com catálogo e saldo ao vivo. Não cobra ninguém e não despacha nada.
      </p>

      {auto && (
        <div
          className={`mb-3 rounded-lg border p-3 text-xs ${
            auto.total > 0 && auto.entregavel === auto.total
              ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/5 text-amber-200"
          }`}
        >
          <div className="mb-1 flex items-center gap-2 font-bold">
            <Bot className="h-3.5 w-3.5" /> O sistema testou sozinho
          </div>
          <div className="text-muted-foreground">
            Última varredura automática:{" "}
            {auto.finished_at ? new Date(auto.finished_at).toLocaleString("pt-BR") : "—"} ·{" "}
            <b>{auto.entregavel}</b> de <b>{auto.total}</b> pacotes com entrega garantida.
          </div>
          {Object.keys(auto.recarga_por_fornecedor ?? {}).length > 0 && (
            <ul className="mt-1 text-muted-foreground">
              {Object.entries(auto.recarga_por_fornecedor as Record<string, number>).map(([slug, falta]) => (
                <li key={slug}>
                  Recarregar <b>{brl(Number(falta))}</b> em <b>{slug}</b>.
                </li>
              ))}
            </ul>
          )}
          {(auto.pausados?.length > 0 || auto.religados?.length > 0) && (
            <div className="mt-1 text-muted-foreground">
              Corrigido sozinho: {auto.pausados?.length ?? 0} tirado(s) da vitrine,{" "}
              {auto.religados?.length ?? 0} religado(s).
            </div>
          )}
        </div>
      )}


      <Button onClick={run} disabled={running} className="mb-3">
        {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {running ? `Testando ${done}/${total} (${pct}%)` : "Rodar bancada completa"}
      </Button>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(Object.keys(s.porVeredito) as Array<keyof typeof s.porVeredito>).map((k) => (
              <div key={k} className="rounded-lg border border-border/50 bg-background/40 p-2">
                <div className="text-lg font-bold">{s.porVeredito[k]}</div>
                <div className="text-[11px] text-muted-foreground">{LABEL[k]}</div>
              </div>
            ))}
          </div>

          {Object.keys(s.recargaPorFornecedor).length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs font-bold text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" /> Recarregue aqui — a venda continua liberada
              </div>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Nada aqui está fora do ar. Só falta dinheiro no fornecedor: o cliente compra, o pedido
                espera e sai sozinho assim que a recarga entra.
              </p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                {Object.entries(s.recargaPorFornecedor).map(([slug, falta]) => {
                  const pacotes = porSaldo[slug]?.length ?? 0;
                  return (
                    <li key={slug} className="flex items-center justify-between gap-2">
                      <span>
                        <b className="text-foreground">{slug}</b>: recarregue {brl(falta)} para liberar o maior
                        pacote {pacotes > 0 ? `(${pacotes} pacote(s) esperando)` : ""}
                      </span>
                      <RecargaFornecedor
                        slug={slug}
                        nome={slug}
                        token={token}
                        label={`💳 Recarregar ${slug}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {travados.length > 0 && (
            <div className="text-xs font-bold text-red-400">Bloqueio real de entrega ({travados.length})</div>
          )}
          {travados.length > 0 && (
            <div className="max-h-80 overflow-auto rounded-lg border border-border/50">
              <table className="w-full text-left text-[11px]">
                <thead className="sticky top-0 bg-background/90">
                  <tr className="text-muted-foreground">
                    <th className="p-2">Pacote</th>
                    <th className="p-2">Rota</th>
                    <th className="p-2">Venda</th>
                    <th className="p-2">O que impede</th>
                  </tr>
                </thead>
                <tbody>
                  {travados.map((r) => (
                    <tr key={`${r.pacote}-${r.quantidade}`} className="border-t border-border/30">
                      <td className="p-2 font-mono">{r.pacote}</td>
                      <td className="p-2">{r.category ?? "—"}</td>
                      <td className="p-2">{brl(r.price_brl)}</td>
                      <td className="p-2">{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {travados.length === 0 && !running && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-emerald-300">
              Nenhum pacote bloqueado: todos entregam ou saem sozinhos na recarga.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
