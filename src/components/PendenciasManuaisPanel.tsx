import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPendenciasManuais, type PendenciasDigest } from "@/lib/pendencias.functions";

/**
 * v299 — "Precisa da sua mão"
 * Um único card que responde: o que aqui é manual e o que já é automático.
 * Vazio = tudo automatizado agora, pode fechar o admin.
 */
export function PendenciasManuaisPanel() {
  const fetchPendencias = useServerFn(getPendenciasManuais);
  const [d, setD] = useState<PendenciasDigest | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? (window.localStorage.getItem("eliteboost_prime_admin_token") ?? "") : "";
      if (!token) { setD(null); return; }
      setD((await fetchPendencias({ data: { token } })) as PendenciasDigest);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [fetchPendencias]);

  useEffect(() => {
    load();
    const id = setInterval(load, 120_000);
    return () => clearInterval(id);
  }, [load]);

  const pend = d?.pendencias ?? [];

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900/70 to-black/40 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-sky-300">
          Precisa da sua mão
        </div>
        <div className="text-[10px] text-white/50">
          {d ? `${d.robosAtivos || 27} robôs cuidando do resto` : ""}
        </div>
      </div>

      {loading && <div className="text-white/60 text-sm mt-2">Lendo pendências…</div>}

      {!loading && pend.length === 0 && (
        <div className="text-white font-extrabold text-base sm:text-lg mt-1">
          Nada manual agora — o sistema está se virando sozinho. ✅
        </div>
      )}

      {pend.length > 0 && (
        <ul className="mt-3 space-y-2">
          {pend.map((p) => {
            const tone =
              p.urgencia === "alta"
                ? "border-red-500/50 bg-red-950/30"
                : p.urgencia === "media"
                  ? "border-amber-500/40 bg-amber-950/20"
                  : "border-white/10 bg-white/5";
            return (
              <li key={p.id} className={`rounded-xl border px-3 py-2.5 ${tone}`}>
                <div className="text-white font-bold text-sm">{p.titulo}</div>
                <div className="text-white/70 text-xs mt-0.5">{p.detalhe}</div>
                {p.href && (
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-2 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {p.cta ?? "Abrir"}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
