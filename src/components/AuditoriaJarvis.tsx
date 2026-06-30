import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { auditarFornecedor, auditoriaContingenciaLocal, type AuditRow } from "@/lib/audit.functions";
import { listarFornecedores } from "@/lib/fornecedores.functions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ScanState = {
  fornecedor: string;
  cotacao: number;
  rows: AuditRow[];
  scannedAt: string;
} | null;

export function AuditoriaJarvis({ token, onBalanceSynced }: { token: string; onBalanceSynced?: () => void }) {
  const auditFn = useServerFn(auditarFornecedor);
  const contingencyFn = useServerFn(auditoriaContingenciaLocal);
  const listFn = useServerFn(listarFornecedores);
  const [fornecedores, setFornecedores] = useState<Array<{ id: string; nome: string; slug: string; ativo: boolean; saldo_atual?: number | null; status?: string | null }>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [balanceBusy, setBalanceBusy] = useState<string | null>(null);
  const [state, setState] = useState<ScanState>(null);

  useEffect(() => {
    listFn({ data: { token } } as any)
      .then((r: any) => { if (r?.ok) setFornecedores(r.fornecedores ?? []); })
      .catch(() => {});
  }, [token]);

  const scan = async (f: { id: string; nome: string }) => {
    setBusy(f.id);
    try {
      const r = await auditFn({ data: { token, fornecedorId: f.id } });
      if (!r.ok) { toast.error(`${f.nome}: ${r.error}`); return; }
      setState({ fornecedor: r.fornecedor, cotacao: r.cotacao, rows: r.rows, scannedAt: r.scannedAt });
      toast.success(`${r.fornecedor}: ${r.rows.length} serviços auditados`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na varredura");
    } finally { setBusy(null); }
  };

  const scanBalance = async (f: { id: string; nome: string; slug: string }) => {
    if (!token) return toast.error("Token administrativo ausente");
    setBalanceBusy(f.id);
    try {
      const res = await fetch("/api/public/check-saldo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        cache: "no-store",
        body: JSON.stringify({ fornecedor: f.slug || f.id }),
      });
      const json = await res.json().catch(() => null) as { ok?: boolean; results?: Array<{ nome: string; saldoUsd: number | null; saldoPersistidoUsd?: number | null; status: string; erro?: string | null }> } | null;
      if (!res.ok || !json?.ok) {
        toast.error(`${f.nome}: falha ao atualizar saldo`);
        return;
      }
      const item = json.results?.find((r) => r.nome === f.nome) ?? json.results?.[0];
      const saldo = item?.saldoUsd ?? item?.saldoPersistidoUsd ?? null;
      setFornecedores((prev) => prev.map((p) => p.id === f.id ? { ...p, saldo_atual: saldo, status: item?.status ?? p.status } : p));
      toast.success(`${f.nome}: ${item?.status ?? "Online"} · saldo ${saldo != null ? `US$ ${saldo.toFixed(2)}` : "não lido"}`);
      onBalanceSynced?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na atualização de saldo");
    } finally {
      setBalanceBusy(null);
    }
  };

  const renderPDF = (current: NonNullable<ScanState>) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    doc.setFontSize(16);
    doc.setTextColor(190, 30, 50);
    doc.text("EliteBoost Prime — Auditoria Contábil J.A.R.V.I.S.", 40, 40);
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Fornecedor: ${current.fornecedor}  ·  Cotação: R$ ${current.cotacao.toFixed(2)}  ·  ${new Date(current.scannedAt).toLocaleString("pt-BR")}`, 40, 58);

    autoTable(doc, {
      startY: 80,
      head: [["ID", "Serviço", "Status", "Custo USD/1k", "Custo BRL/1k", "Venda BRL/1k", "Taxa PIX", "Lucro BRL", "Margem %"]],
      body: current.rows.map((r) => [
        r.serviceId, r.name.substring(0, 60), r.status,
        `$ ${r.costUsdPer1k.toFixed(4)}`,
        `R$ ${r.costBrlPer1k.toFixed(2)}`,
        `R$ ${r.vendaBrlPer1k.toFixed(2)}`,
        `R$ ${r.taxaPix.toFixed(2)}`,
        `R$ ${r.lucroBrl.toFixed(2)}`,
        `${r.margemPct.toFixed(1)}%`,
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [190, 30, 50], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 250] },
    });

    const totalLucro = current.rows.reduce((s, r) => s + r.lucroBrl, 0);
    const mediaMargem = current.rows.length ? current.rows.reduce((s, r) => s + r.margemPct, 0) / current.rows.length : 0;
    const finalY = (doc as any).lastAutoTable?.finalY ?? 100;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Total Lucro Médio (por 1k): R$ ${totalLucro.toFixed(2)}  ·  Margem Média: ${mediaMargem.toFixed(1)}%`, 40, finalY + 24);

    doc.save(`auditoria-${current.fornecedor.replace(/\s+/g, "_")}-${Date.now()}.pdf`);
    toast.success("PDF contábil exportado");
  };

  const exportPDF = async () => {
    let current = state;
    if (!current) {
      setBusy("contingency-pdf");
      try {
        const r = await contingencyFn({ data: { token } });
        if (!r.ok) { toast.error(r.error); return; }
        current = { fornecedor: r.fornecedor, cotacao: r.cotacao, rows: r.rows, scannedAt: r.scannedAt };
        setState(current);
      } catch (e: any) {
        toast.error(e?.message ?? "Falha ao montar contingência local");
        return;
      } finally {
        setBusy(null);
      }
    }
    if (!current) return;
    renderPDF(current);
  };

  const statusBadge = (s: AuditRow["status"]) => {
    const map = {
      ATIVO: "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
      INATIVO: "bg-zinc-700/40 border-zinc-500 text-zinc-300",
      REVISAO: "bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    };
    return <span className={`px-2 py-0.5 rounded border text-[10px] font-bold font-mono ${map[s]}`}>{s === "REVISAO" ? "REVISÃO" : s}</span>;
  };

  return (
    <div className="rounded-2xl border-2 border-red-500/60 bg-gradient-to-br from-black via-red-950/20 to-black p-4 shadow-[0_0_30px_rgba(255,0,40,0.25)] space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-red-300 font-black text-lg tracking-widest uppercase">📊 Auditoria J.A.R.V.I.S.</div>
          <div className="text-[10px] text-red-200/70 font-mono">Cross-check de APIs · Margem real · Conciliação USD→BRL</div>
        </div>
        <Button
          size="sm" onClick={exportPDF}
          className="bg-red-600 hover:bg-red-500 text-white font-bold shadow-[0_0_14px_rgba(239,68,68,0.65)]"
        >
          {busy === "contingency-pdf" ? "⏳ GERANDO PDF..." : "📥 EXPORTAR PDF CONTÁBIL"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {fornecedores.length === 0 && <div className="text-xs text-red-200/60 font-mono">Carregando fornecedores...</div>}
        {fornecedores.map((f) => (
          <div key={f.id} className="flex flex-col gap-1 rounded-lg border border-white/10 bg-black/30 p-1.5">
            <Button
              size="sm" variant="outline"
              onClick={() => scanBalance(f)}
              disabled={balanceBusy === f.id}
              className="border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10 font-mono text-xs"
            >
              {balanceBusy === f.id ? `⏳ ${f.nome}...` : `🔄 Varrer ${f.nome}`}
            </Button>
            <div className="flex items-center gap-1">
              <Button
                size="sm" variant="outline"
                onClick={() => scan(f)}
                disabled={busy === f.id}
                className="border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/10 font-mono text-xs"
                title="Auditoria contábil de serviços"
              >
                {busy === f.id ? "📊..." : "📊"}
              </Button>
              <span className="text-[10px] font-mono text-cyan-100">
                {f.saldo_atual != null ? `US$ ${Number(f.saldo_atual).toFixed(2)}` : "saldo não lido"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {state && (
        <div className="rounded-lg border border-red-500/30 bg-black/60 overflow-hidden">
          <div className="px-3 py-2 border-b border-red-500/20 flex flex-wrap gap-3 items-center justify-between text-xs font-mono">
            <span className="text-cyan-200">Fornecedor: <b className="text-cyan-100">{state.fornecedor}</b></span>
            <span className="text-amber-200">Cotação: <b>R$ {state.cotacao.toFixed(2)}</b></span>
            <span className="text-emerald-200">{state.rows.length} serviços</span>
            <span className="text-white/50">{new Date(state.scannedAt).toLocaleString("pt-BR")}</span>
          </div>
          <div className="overflow-x-auto max-h-[420px]">
            <table className="w-full text-xs font-mono">
              <thead className="bg-red-950/40 text-red-200 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left">ID</th>
                  <th className="px-2 py-2 text-left">Serviço</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Custo USD/1k</th>
                  <th className="px-2 py-2 text-right">Custo BRL/1k</th>
                  <th className="px-2 py-2 text-right">Venda BRL/1k</th>
                  <th className="px-2 py-2 text-right">Lucro</th>
                  <th className="px-2 py-2 text-right">Margem</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((r) => (
                  <tr key={r.serviceId} className="border-t border-white/5 hover:bg-red-500/5">
                    <td className="px-2 py-1.5 text-cyan-200">{r.serviceId}</td>
                    <td className="px-2 py-1.5 text-white/90 max-w-[280px] truncate">{r.name}</td>
                    <td className="px-2 py-1.5 text-center">{statusBadge(r.status)}</td>
                    <td className="px-2 py-1.5 text-right text-white/70">${r.costUsdPer1k.toFixed(4)}</td>
                    <td className="px-2 py-1.5 text-right text-amber-200">R$ {r.costBrlPer1k.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right text-cyan-200">R$ {r.vendaBrlPer1k.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-right text-emerald-300 font-bold">R$ {r.lucroBrl.toFixed(2)}</td>
                    <td className={`px-2 py-1.5 text-right font-bold ${r.margemPct >= 50 ? "text-emerald-300" : r.margemPct >= 30 ? "text-amber-300" : "text-red-400"}`}>
                      {r.margemPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {state.rows.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-white/50">Nenhum serviço mapeado retornou da API.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
