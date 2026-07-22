import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/admin/health-catalog")({
  head: () => ({
    meta: [
      { title: "Saúde do Catálogo · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: HealthCatalogPage,
});

const ADMIN_TOKEN_KEY = "eliteboost_prime_admin_token";

type Row = {
  pacote: string;
  category: string | null;
  quantidade: number;
  cost_brl: number | null;
  price_brl: number | null;
  is_sellable: boolean;
  sellable_reason: string | null;
  last_dry_run: string | null;
  smmhype_service_id: string | null;
  smmpanel_service_id: string | null;
  verified_service_id: string | null;
};

type Data = { ok: true; total: number; sellable: number; paused: number; rows: Row[] } | { ok: false; error: string };

function HealthCatalogPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [filter, setFilter] = useState<"all" | "sellable" | "paused">("all");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setToken(window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "");
  }, []);

  const load = async () => {
    if (!token) { setMsg("Cole o admin token primeiro"); return; }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/public/admin/catalog-health", { headers: { "x-admin-token": token } });
      const j = (await res.json()) as Data;
      setData(j);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const runDry = async () => {
    if (!token) { setMsg("Cole o admin token primeiro"); return; }
    setRunning(true);
    setMsg(null);
    try {
      const res = await fetch("/api/public/hooks/dry-run-catalog", {
        method: "POST",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: "{}",
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "falhou");
      setMsg(`✅ Teste rodou: ${j.sellable} vendáveis, ${j.paused} pausados, ${j.changed} mudaram de status`);
      await load();
    } catch (e) {
      setMsg("❌ " + (e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => { if (token) load(); /* eslint-disable-next-line */ }, [token]);

  const rows = useMemo(() => {
    if (!data || !data.ok) return [];
    if (filter === "sellable") return data.rows.filter((r) => r.is_sellable);
    if (filter === "paused") return data.rows.filter((r) => !r.is_sellable);
    return data.rows;
  }, [data, filter]);

  return (
    <div className="min-h-screen bg-black text-amber-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="text-xl md:text-2xl font-black tracking-wide text-amber-300">
            🩺 SAÚDE DO CATÁLOGO
          </h1>
          <Link to="/admin" className="text-amber-400 hover:text-amber-200 underline text-sm">← voltar</Link>
        </div>

        {!token && (
          <div className="rounded border border-amber-700 bg-amber-950/30 p-3 text-sm">
            Token não encontrado. Vá em <Link to="/admin" className="underline">/admin</Link>, cole seu token, e volte aqui.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={runDry}
            disabled={running || !token}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm"
          >
            {running ? "Rodando teste seco…" : "▶ Rodar Teste Seco Agora"}
          </button>
          <button
            onClick={load}
            disabled={loading || !token}
            className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-sm"
          >
            {loading ? "Carregando…" : "Recarregar"}
          </button>
        </div>

        {msg && <div className="text-sm text-amber-200">{msg}</div>}

        {data && data.ok && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setFilter("all")} className={`rounded p-3 text-left border ${filter === "all" ? "border-amber-400" : "border-slate-700"} bg-slate-900`}>
                <div className="text-xs uppercase text-slate-400">Total</div>
                <div className="text-2xl font-black">{data.total}</div>
              </button>
              <button onClick={() => setFilter("sellable")} className={`rounded p-3 text-left border ${filter === "sellable" ? "border-emerald-400" : "border-slate-700"} bg-emerald-950/30`}>
                <div className="text-xs uppercase text-emerald-400">Pode vender</div>
                <div className="text-2xl font-black text-emerald-300">{data.sellable}</div>
              </button>
              <button onClick={() => setFilter("paused")} className={`rounded p-3 text-left border ${filter === "paused" ? "border-red-400" : "border-slate-700"} bg-red-950/30`}>
                <div className="text-xs uppercase text-red-400">Pausado</div>
                <div className="text-2xl font-black text-red-300">{data.paused}</div>
              </button>
            </div>

            <div className="overflow-auto rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase">
                  <tr>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Pacote</th>
                    <th className="text-left p-2">Categoria</th>
                    <th className="text-right p-2">Qtd</th>
                    <th className="text-right p-2">Custo</th>
                    <th className="text-right p-2">Preço</th>
                    <th className="text-left p-2">Fornecedores</th>
                    <th className="text-left p-2">Motivo</th>
                    <th className="text-left p-2">Último teste</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.pacote} className={`border-t border-slate-800 ${r.is_sellable ? "" : "bg-red-950/20"}`}>
                      <td className="p-2">
                        {r.is_sellable
                          ? <span className="text-emerald-400 font-bold">✅ Vende</span>
                          : <span className="text-red-400 font-bold">🛑 Pausado</span>}
                      </td>
                      <td className="p-2 font-mono">{r.pacote}</td>
                      <td className="p-2">{r.category}</td>
                      <td className="p-2 text-right">{r.quantidade.toLocaleString("pt-BR")}</td>
                      <td className="p-2 text-right">R$ {Number(r.cost_brl ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-right">R$ {Number(r.price_brl ?? 0).toFixed(2)}</td>
                      <td className="p-2 text-xs">
                        {[r.smmhype_service_id && "H", r.smmpanel_service_id && "P", r.verified_service_id && "V"].filter(Boolean).join(" · ") || <span className="text-red-400">nenhum</span>}
                      </td>
                      <td className="p-2">{r.sellable_reason}</td>
                      <td className="p-2 text-slate-500">{r.last_dry_run ? new Date(r.last_dry_run).toLocaleString("pt-BR") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {data && !data.ok && (
          <div className="rounded border border-red-700 bg-red-950/30 p-3 text-sm text-red-200">
            Erro: {data.error}
          </div>
        )}
      </div>
    </div>
  );
}
