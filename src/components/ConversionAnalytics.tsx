import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  total: number;
  pagos: number;
  pendentes: number;
  falhos: number;
  conversao: number;
  recuperacao: number;
  faturamento: number;
};

export function ConversionAnalytics() {
  const [s, setS] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("pedidos")
          .select("status, valor_brl, recovered")
          .limit(2000);
        const rows = (data as Array<{ status: string; valor_brl: number | null; recovered: boolean | null }> | null) ?? [];
        const total = rows.length;
        const pagos = rows.filter((r) => r.status === "pago").length;
        const pendentes = rows.filter((r) => r.status === "pendente").length;
        const falhos = rows.filter((r) => r.status === "falho" || r.status === "erro").length;
        const recuperados = rows.filter((r) => r.recovered === true).length;
        const faturamento = rows
          .filter((r) => r.status === "pago")
          .reduce((acc, r) => acc + (Number(r.valor_brl) || 0), 0);
        const conversao = total > 0 ? (pagos / total) * 100 : 0;
        const recuperacao = pendentes + recuperados > 0 ? (recuperados / (pendentes + recuperados)) * 100 : 0;
        if (alive) setS({ total, pagos, pendentes, falhos, conversao, recuperacao, faturamento });
      } catch {
        if (alive) setS(null);
      } finally {
        if (alive) setLoading(false);
      }
    };
    void load();
    const id = window.setInterval(load, 30_000);
    return () => { alive = false; window.clearInterval(id); };
  }, []);

  return (
    <section className="rounded-xl border border-cyan-500/40 bg-black/60 backdrop-blur-xl p-4 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
          📊 Conversão em Tempo Real · Pix / Carrinho
        </h3>
        {loading && <span className="text-[10px] text-white/40">atualizando...</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <Stat label="Taxa Pix" value={s ? `${s.conversao.toFixed(1)}%` : "—"} accent="text-emerald-300" />
        <Stat label="Recuperação" value={s ? `${s.recuperacao.toFixed(1)}%` : "—"} accent="text-amber-300" />
        <Stat label="Pagos" value={s?.pagos ?? "—"} accent="text-cyan-300" />
        <Stat label="Pendentes" value={s?.pendentes ?? "—"} accent="text-red-300" />
      </div>
      <div className="mt-3 text-[11px] text-white/60 font-mono text-center">
        Total amostra: {s?.total ?? 0} · Faturamento: R$ {(s?.faturamento ?? 0).toFixed(2)}
      </div>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-lg font-extrabold ${accent}`}>{value}</div>
    </div>
  );
}
