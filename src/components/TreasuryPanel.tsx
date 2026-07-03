import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { pricingLedgerSnapshot, treasurySnapshot, type TreasurySnapshot } from "@/lib/treasury.functions";
import { walletsSnapshot, type WalletsSnapshot } from "@/lib/wallets.functions";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

function brl(n: number) { return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function TreasuryPanel({ token }: { token: string }) {
  const fn = useServerFn(treasurySnapshot);
  const ledgerFn = useServerFn(pricingLedgerSnapshot);
  const walletsFn = useServerFn(walletsSnapshot);
  const [snap, setSnap] = useState<TreasurySnapshot | null>(null);
  const [wallets, setWallets] = useState<WalletsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);

  const exportLedger = async () => {
    const liveRows = snap?.ok ? snap.ultimas.map((u) => [
      u.occurred_at,
      u.network ?? "",
      String(u.faturamento),
      String(u.lucro_liquido),
      u.supplier_cost != null ? String(u.supplier_cost) : "",
      u.provider_selected ?? "",
      u.net_profit_percentage != null ? `${u.net_profit_percentage}%` : "",
      "tesouraria",
    ]) : [];
    let fallbackRows: string[][] = [];
    try {
      const ledger = await ledgerFn({ data: { token } });
      if (ledger.ok) {
        fallbackRows = ledger.rows.map((r) => [
          ledger.generatedAt, r.category, String(r.venda), String(r.lucro), String(r.custo), r.source, `${r.margemPct}%`,
          `${r.pacote} · qtd ${r.quantidade}`,
        ]);
      }
    } catch { /* exporta o que houver */ }

    const rows = [
      ["occurred_at", "network_or_category", "faturamento", "lucro_liquido", "supplier_cost", "provider_selected", "net_profit_percentage", "origem"],
      ...liveRows,
      ...fallbackRows,
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `livro-contabil-${Date.now()}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const exportPdf = async () => {
    if (!snap || !snap.ok) return;
    setBusyPdf(true);
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      let y = 40;

      // Header
      doc.setFillColor(10, 10, 10);
      doc.rect(0, 0, W, 70, "F");
      doc.setTextColor(255, 215, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("EliteBoost Prime · Livro Contábil", 40, 32);
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} · Diretor: Fabiano`, 40, 52);
      y = 90;

      // KPIs
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Indicadores Consolidados", 40, y); y += 18;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const kpis = [
        `Lucro hoje: ${brl(snap.diario.lucro)}   |   Faturamento hoje: ${brl(snap.diario.fat)}`,
        `Lucro 7d: ${brl(snap.semanal.lucro)}   |   Faturamento 7d: ${brl(snap.semanal.fat)}`,
        `Lucro 30d: ${brl(snap.mensal.lucro)}   |   Faturamento 30d: ${brl(snap.mensal.fat)}`,
        `Previsão 30d (base 7d × 30): ${brl(snap.previsao30d)}`,
        `Taxa Pix hoje: ${brl(snap.diario.pix)}   |   Custo API hoje: ${brl(snap.diario.custo)}`,
      ];
      kpis.forEach((k) => { doc.text(k, 40, y); y += 14; });
      y += 8;

      // Agregado por rede
      const byNet = new Map<string, { fat: number; lucro: number; custo: number; n: number }>();
      snap.ultimas.forEach((u) => {
        const k = u.network ?? "?";
        const cur = byNet.get(k) ?? { fat: 0, lucro: 0, custo: 0, n: 0 };
        cur.fat += u.faturamento; cur.lucro += u.lucro_liquido; cur.custo += u.supplier_cost ?? 0; cur.n += 1;
        byNet.set(k, cur);
      });
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("Ganhos por Rede Social", 40, y); y += 18;
      doc.setFontSize(10); doc.setFont("helvetica", "bold");
      doc.text("Rede", 40, y); doc.text("Qtd", 160, y); doc.text("Faturam.", 220, y); doc.text("Custo API", 320, y); doc.text("Lucro Líq.", 420, y); doc.text("Margem %", 510, y);
      y += 4; doc.setDrawColor(180); doc.line(40, y, W - 40, y); y += 12;
      doc.setFont("helvetica", "normal");
      Array.from(byNet.entries()).forEach(([net, v]) => {
        const pct = v.fat > 0 ? ((v.lucro / v.fat) * 100).toFixed(1) : "0.0";
        doc.text(String(net), 40, y);
        doc.text(String(v.n), 160, y);
        doc.text(brl(v.fat), 220, y);
        doc.text(brl(v.custo), 320, y);
        doc.text(brl(v.lucro), 420, y);
        doc.text(`${pct}%`, 510, y);
        y += 14;
        if (y > 760) { doc.addPage(); y = 40; }
      });
      y += 10;

      // Tabela detalhada
      if (y > 700) { doc.addPage(); y = 40; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(12);
      doc.text("Arbitragem · Últimos Pedidos", 40, y); y += 18;
      doc.setFontSize(9); doc.setFont("helvetica", "bold");
      doc.text("Data", 40, y); doc.text("Rede", 160, y); doc.text("Forn.", 220, y); doc.text("Venda", 300, y); doc.text("Custo", 370, y); doc.text("Lucro", 440, y); doc.text("Margem", 510, y);
      y += 4; doc.line(40, y, W - 40, y); y += 12;
      doc.setFont("helvetica", "normal");
      snap.ultimas.forEach((u) => {
        if (y > 800) { doc.addPage(); y = 40; }
        doc.text(new Date(u.occurred_at).toLocaleDateString("pt-BR"), 40, y);
        doc.text(String(u.network ?? "?").slice(0, 10), 160, y);
        doc.text(String(u.provider_selected ?? "-").slice(0, 12), 220, y);
        doc.text(brl(u.faturamento), 300, y);
        doc.text(u.supplier_cost != null ? brl(u.supplier_cost) : "-", 370, y);
        doc.text(brl(u.lucro_liquido), 440, y);
        doc.text(u.net_profit_percentage != null ? `${u.net_profit_percentage}%` : "-", 510, y);
        y += 12;
      });

      // Footer
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(120);
        doc.text(`EliteBoost Prime · Confidencial · Página ${i}/${pages}`, 40, 820);
      }

      doc.save(`livro-contabil-${Date.now()}.pdf`);
    } finally {
      setBusyPdf(false);
    }
  };

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try { setSnap(await fn({ data: { token } })); } catch { setSnap({ ok: false, error: "NET" }); }
    try { setWallets(await walletsFn({ data: { token } })); } catch { setWallets({ ok: false, error: "NET" }); }
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [token]);
  // v160 — Realtime push: substitui polling 1s por evento Postgres Changes.
  useAdminRealtime(["virtual_wallets", "admin_treasury", "pedidos"], () => { void load(); });

  const hasLedger = !!(snap && snap.ok && snap.ultimas.length > 0);

  if (!snap || !snap.ok) {
    return (
      <section className="rounded-xl border border-amber-400/40 bg-amber-950/20 p-3 text-amber-200 text-xs flex items-center justify-between gap-2 flex-wrap">
        <span>💰 Tesouraria · {loading ? "carregando…" : (snap as any)?.error ?? "sem dados"}</span>
        <button
          onClick={() => void exportLedger()}
          className="text-[10px] px-2 py-1 rounded-md border border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
        >
          📥 EXPORTAR LIVRO (CSV)
        </button>
      </section>
    );
  }
  const Cell = ({ label, v, sub }: { label: string; v: string; sub?: string }) => (
    <div className="rounded-lg border border-cyan-400/30 bg-black/40 p-2">
      <div className="text-[10px] uppercase tracking-wider text-cyan-300/80">{label}</div>
      <div className="text-base font-bold text-white">{v}</div>
      {sub && <div className="text-[10px] text-white/50">{sub}</div>}
    </div>
  );
  return (
    <section className="rounded-xl border border-cyan-400/40 bg-cyan-950/20 backdrop-blur-xl p-3 shadow-[0_0_18px_rgba(0,242,254,0.25)]">
      <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
        <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">💰 Tesouraria Inteligente</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => void exportLedger()}
            className="text-[10px] px-2 py-1 rounded-md border border-emerald-400/60 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(52,211,153,0.35)]"
          >
            📥 EXPORTAR LIVRO (CSV)
          </button>
          <button
            onClick={() => void exportPdf()}
            disabled={!hasLedger || busyPdf}
            className="text-[10px] px-2 py-1 rounded-md border border-amber-400/70 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(251,191,36,0.45)]"
            title={hasLedger ? "Gerar PDF contábil" : "Sem registros em admin_treasury"}
          >
            {busyPdf ? "⏳ gerando…" : "📕 EXPORTAR PDF CONTÁBIL"}
          </button>
          <button onClick={load} className="text-[10px] text-cyan-200/70 hover:text-cyan-100">↻ atualizar</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Cell label="Lucro hoje" v={brl(snap.diario.lucro)} sub={`Fat: ${brl(snap.diario.fat)}`} />
        <Cell label="Lucro 7d" v={brl(snap.semanal.lucro)} sub={`Fat: ${brl(snap.semanal.fat)}`} />
        <Cell label="Lucro 30d" v={brl(snap.mensal.lucro)} sub={`Fat: ${brl(snap.mensal.fat)}`} />
        <Cell label="Previsão 30d" v={brl(snap.previsao30d)} sub="base 7d × 30" />
      </div>
      <div className="mt-2 text-[10px] text-white/60">
        Taxa Pix hoje: {brl(snap.diario.pix)} · Custo API: {brl(snap.diario.custo)}
      </div>
      {snap.ultimas.length > 0 && (
        <ul className="mt-2 text-[10px] font-mono text-cyan-100/80 space-y-0.5 max-h-32 overflow-y-auto">
          {snap.ultimas.map((u, i) => (
            <li key={i}>
              {new Date(u.occurred_at).toLocaleString("pt-BR")} · {u.network ?? "?"} · {u.provider_selected ?? "-"} · {brl(u.faturamento)} → {brl(u.lucro_liquido)} ({u.net_profit_percentage ?? "—"}%)
            </li>
          ))}
        </ul>
      )}
      {/* v116 — Banco Interno Virtual (escuta de 1s) */}
      {wallets && wallets.ok && (
        <div className="mt-3 border-t border-cyan-400/20 pt-2">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/90">🏦 Banco Interno Virtual</h4>
            <span className="text-[9px] text-amber-200/80">Fila Aguardando Processamento Financeiro: <strong className="text-amber-100">{wallets.queueCount}</strong></span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {wallets.wallets.map((w) => (
              <div key={w.wallet_key} className="rounded-lg border border-cyan-400/25 bg-black/40 p-2">
                <div className="text-[9px] uppercase tracking-wider text-cyan-300/70">{w.label}</div>
                <div className="text-sm font-bold text-white">{brl(Number(w.saldo_brl))}</div>
                {w.reserved_brl > 0 && <div className="text-[9px] text-amber-300/80">Reservado: {brl(Number(w.reserved_brl))}</div>}
              </div>
            ))}

          </div>
        </div>
      )}
    </section>
  );
}
