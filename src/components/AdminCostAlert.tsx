import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  network: string;
  service_type: string;
  rate: number | null;
  previous_rate: number | null;
};

/**
 * Alerta vermelho no topo do /admin: detecta serviços cujo custo base (rate)
 * subiu vs previous_rate, sinalizando aperto de margem.
 */
export function AdminCostAlert() {
  const [risks, setRisks] = useState<Row[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("service_id_overrides")
        .select("network, service_type, rate, previous_rate")
        .eq("bloqueado", false);
      if (cancelled || !data) return;
      const flagged = (data as Row[]).filter(
        (r) => r.rate != null && r.previous_rate != null && Number(r.rate) > Number(r.previous_rate) * 1.1,
      );
      setRisks(flagged);
    })();
    return () => { cancelled = true; };
  }, []);

  if (risks.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-red-500/80 bg-red-950/40 backdrop-blur-xl p-3 shadow-[0_0_24px_rgba(255,0,40,0.5)] animate-pulse">
      <div className="text-red-300 font-bold text-sm uppercase tracking-wider">
        🚨 J.A.R.V.I.S. · Alerta de margem
      </div>
      <div className="text-white/90 text-xs mt-1">
        Diretor Fabiano, detectei {risks.length} serviço(s) com custo base elevado em &gt;10%.
        Ajuste o preço de venda ou troque o fornecedor ativo imediatamente.
      </div>
      <ul className="mt-2 text-[11px] text-red-200/90 space-y-0.5 font-mono">
        {risks.slice(0, 5).map((r, i) => (
          <li key={i}>
            • {r.network}/{r.service_type}: {Number(r.previous_rate).toFixed(4)} → {Number(r.rate).toFixed(4)}
          </li>
        ))}
      </ul>
    </div>
  );
}
